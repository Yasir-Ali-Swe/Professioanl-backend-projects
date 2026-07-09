// controllers/billing.controller.js
import stripe from "../config/stripe.config.js";
import subscriptionPlanModel from "../models/organization.subscriptionPlan.js";
import subscriptionModel from "../models/subscription.model.js";
import organizationModel from "../models/organization.model.js";
import { CLIENT_URL } from "../config/env.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const premiumPlan = await subscriptionPlanModel.findOne({
      name: "premium",
    });
    if (!premiumPlan?.stripePriceId) {
      return res.status(400).json({
        success: false,
        message: "Premium plan not configured",
      });
    }

    const org = await organizationModel.findById(organizationId);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: org.contactEmail,
      line_items: [{ price: premiumPlan.stripePriceId, quantity: 1 }],
      success_url: `${CLIENT_URL}/billing/success`,
      cancel_url: `${CLIENT_URL}/billing/cancel`,
      metadata: { organizationId: organizationId.toString() },
    });

    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Error in createCheckoutSession:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const organizationId = session.metadata.organizationId;
        const premiumPlan = await subscriptionPlanModel.findOne({
          name: "premium",
        });

        await subscriptionModel.findOneAndUpdate(
          { organizationId },
          {
            subscriptionPlanId: premiumPlan._id,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            status: "active",
          },
          { upsert: true },
        );

        await organizationModel.findByIdAndUpdate(organizationId, {
          subscriptionPlan: premiumPlan._id,
        });

        console.log(
          `Subscription activated for organization: ${organizationId}`,
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await subscriptionModel.findOneAndUpdate(
          { stripeSubscriptionId: invoice.subscription },
          { status: "past_due" },
        );
        console.log(`Payment failed for subscription: ${invoice.subscription}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const freePlan = await subscriptionPlanModel.findOne({ name: "free" });
        const subscription = await subscriptionModel.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          { status: "canceled", subscriptionPlanId: freePlan._id },
        );
        if (subscription) {
          await organizationModel.findByIdAndUpdate(
            subscription.organizationId,
            {
              subscriptionPlan: freePlan._id,
            },
          );
        }
        console.log(`Subscription canceled: ${sub.id}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        await subscriptionModel.findOneAndUpdate(
          { stripeSubscriptionId: invoice.subscription },
          { status: "active" },
        );
        console.log(
          `Payment succeeded for subscription: ${invoice.subscription}`,
        );
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

export const getSubscription = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const subscription = await subscriptionModel
      .findOne({ organizationId })
      .populate("subscriptionPlanId", "name price billingCycle aiFeatures");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No subscription found",
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("Error in getSubscription:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const subscription = await subscriptionModel.findOne({ organizationId });

    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: "No active subscription to cancel",
      });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    res.status(200).json({
      success: true,
      message:
        "Subscription will cancel at the end of the current billing period",
    });
  } catch (error) {
    console.error("Error in cancelSubscription:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

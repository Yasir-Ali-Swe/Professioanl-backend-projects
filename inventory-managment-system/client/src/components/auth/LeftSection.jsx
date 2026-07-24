import { Boxes, TrendingUp, Bot, ReceiptText, Users, PackageSearch, BellRing, ArrowLeft, CircleQuestionMark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const features = [
  { icon: <PackageSearch size={20} className="text-primary" />, text: "Track products and stock in real time" },
  { icon: <ReceiptText size={20} className="text-primary" />, text: "Generate invoices instantly" },
  { icon: <TrendingUp size={20} className="text-primary" />, text: "AI-powered demand forecasting" },
  { icon: <BellRing size={20} className="text-primary" />, text: "Smart reorder & anomaly alerts" },
  { icon: <Bot size={20} className="text-primary" />, text: "Ask your data with the AI chatbot" },
  { icon: <Users size={20} className="text-primary" />, text: "Manage your team with role-based access" },
];

export const AuthLeftSection = () => {
  const navigate = useNavigate();

  return (
    <div className={`hidden lg:flex lg:flex-col justify-center bg-foreground px-6 xl:px-8 h-full `}>
      <div>
        <Button
          className="mb-3 h-8 text-sm"
          onClick={() => navigate(-1)}
        >
          <span className="flex items-center gap-1 rounded-md">
            <ArrowLeft className="h-3.5 w-4" />
            Go Back
          </span>
        </Button>
        <h1 className="text-xl lg:text-2xl font-bold text-background flex items-center gap-3">
          <Boxes className="size-8 lg:size-9 text-primary" />
          StockPilot
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground font-light mt-1 mb-2">
          AI-powered inventory management, built for growing businesses.
        </p>
      </div>

      <div className="mt-4 lg:mt-5">
        <h2 className="text-base lg:text-lg font-semibold text-background flex items-center gap-2">
          Why StockPilot
          <CircleQuestionMark size={16} className="lg:size-4.5" />
        </h2>
        <p className="text-muted-foreground text-sm lg:text-base font-light my-2 lg:my-3 text-justify">
          StockPilot brings your products, stock, invoices, and purchase orders into one secure
          platform — with AI features that predict demand, flag anomalies, and answer questions
          about your business in plain English, so you always know what's happening in your
          inventory before it becomes a problem.
        </p>

        <ul className="mt-3 lg:mt-4 space-y-2 lg:space-y-2.5 text-background">
          {features.map((feature, index) => (
            <li key={index} className="group">
              <p className="flex items-center gap-3 text-sm lg:text-base text-background transition-colors duration-300 ease-in-out group-hover:text-border">
                <span className="transition-colors duration-300 ease-in-out group-hover:text-border">
                  {feature.icon}
                </span>
                {feature.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
import {
  sendVerificationEmail,
  sendForgetPasswordEmail,
  sendAccountCreatedEmail,
} from "./email.services.js";

const emailQueue = [];

let isProcessing = false;

const processQueue = async () => {
  if (isProcessing) return;
  isProcessing = true;

  while (emailQueue.length > 0) {
    const task = emailQueue.shift();
    try {
      await task();
    } catch (error) {
      console.error("Email task failed:", error.message);
    }
  }

  isProcessing = false;
};

export const queueEmail = (emailTask) => {
  emailQueue.push(emailTask);
  processQueue();
};

export const queueVerificationEmail = (name, token, email) => {
  queueEmail(() => sendVerificationEmail(name, token, email));
};

export const queueForgetPasswordEmail = (name, token, email) => {
  queueEmail(() => sendForgetPasswordEmail(name, token, email));
};

export const queueAccountCreatedEmail = (email, name, password) => {
  queueEmail(() => sendAccountCreatedEmail(name, email, password));
};

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

export const FAQS = [
  {
    question: "What do I receive during the first 14 days?",
    answer:
      "You can use the Today actions, meal tools and recipes, movement and habit tools, progress tracking, Ask/VITA educational support, community features, and the printable report. Onboarding introduces the tools gradually so you do not need to learn everything at once.",
  },
  {
    question: "What does the membership cost?",
    answer:
      "You are charged $27 at checkout for your first 14 days. Unless you cancel before renewal, the membership then renews automatically at $67 per month until canceled. Prices are in U.S. dollars.",
  },
  {
    question: "How do I cancel?",
    answer:
      "Sign in and open Settings or Billing, then choose Cancel membership. Cancellation stops future renewal charges. You keep access through the period you already paid for. You do not need to call, email, or complete a retention survey to cancel.",
  },
  {
    question: "What is the refund policy?",
    answer:
      "Each $27 or $67 membership charge has a 30-day refund-request window. Submit the request from the email on your account through in-app Support or info@diabetesresetmethod.com. An approved refund cancels the membership and ends access when the refund is processed. Cancellation by itself does not request a refund, and account deletion is not a refund request. Read the complete Refund Terms before joining.",
  },
  {
    question: "Does DRM replace my doctor or another healthcare professional?",
    answer:
      "No. DRM is a self-guided educational membership. It does not diagnose, treat, prescribe, monitor emergencies, or replace care from a doctor, pharmacist, dietitian, diabetes educator, or other qualified professional.",
  },
  {
    question: "Will DRM tell me to change medication?",
    answer:
      "No. Never start, stop, or change medication based on DRM. Medication decisions belong with your qualified prescriber or pharmacist.",
  },
  {
    question: "Are fasting or supplements required?",
    answer:
      "No. Fasting scheduling is unavailable, and supplements are not required. DRM does not sell a required supplement pack or use either one as a condition of progress.",
  },
  {
    question: "Is DRM for Type 1 diabetes?",
    answer:
      "No. The current membership was not designed or reviewed for Type 1 diabetes. Do not use DRM to make insulin or other treatment decisions.",
  },
  {
    question: "Does DRM use AI or share health information?",
    answer:
      "DRM stores the information you choose to enter to provide the membership. Health-sensitive AI processing is currently disabled. AI-generated content is labeled and educational only. Before any feature sends health information to an outside AI provider, DRM must show a separate consent choice. You can download or delete your data in Settings. Read the Privacy Notice, Consumer Health Data Privacy Policy, and AI Use Notice for details.",
  },
  {
    question: "How much time does it take?",
    answer:
      "Many Today actions are designed to take about 10 minutes. You can use only the tools that are useful to you; you do not need to complete a large course or maintain a perfect streak.",
  },
  {
    question: "What should I do in an emergency?",
    answer:
      "Do not use DRM for emergency help. Contact local emergency services or a qualified healthcare professional. Follow your healthcare professional's existing safety plan for urgent glucose or other symptoms.",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="faq" className="scroll-mt-24 bg-background py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-8">
            Frequently asked questions
          </h2>
        </ScrollReveal>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <ScrollReveal key={faq.question} delay={index * 0.03}>
                <div
                  className={`bg-card rounded-xl border-2 transition-colors shadow-sm ${
                    open ? "border-primary" : "border-border hover:border-primary"
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-button-${index}`}
                    onClick={() => setOpenIndex(open ? -1 : index)}
                    className="w-full flex items-center justify-between gap-4 p-6 min-h-[44px] text-left"
                  >
                    <span className="font-heading font-semibold text-foreground">
                      {faq.question}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        id={`faq-panel-${index}`}
                        role="region"
                        aria-labelledby={`faq-button-${index}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6">
                          <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

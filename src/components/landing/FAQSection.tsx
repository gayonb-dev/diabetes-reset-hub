import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

export const FAQS = [
  {
    question: "What am I charged today?",
    answer:
      "You are charged $27 when your payment is confirmed. That payment gives you access to DRM for your first 14 days.",
  },
  {
    question: "What happens after the first 14 days?",
    answer:
      "Unless you cancel, your membership automatically continues at $67 per month until canceled.",
  },
  {
    question: "How do I cancel?",
    answer:
      "Sign in and open Settings or Billing. You can cancel in the app without calling, emailing, completing a retention survey, or reviewing another offer.\n\nCancellation prevents the next renewal. Your access continues through the period you already paid for.",
  },
  {
    question: "Does canceling automatically give me a refund?",
    answer:
      "No. Cancellation and refunds are separate.\n\nEach $27 and $67 charge has a 30-day refund-request window. Use in-app Support or the contact method listed in the Refund Terms to submit a request. Refund Terms apply.",
  },
  {
    question: "Does DRM provide medical advice?",
    answer:
      "No. DRM provides self-guided educational tools. It does not diagnose conditions, prescribe treatment, change medication, or replace your healthcare professional.",
  },
  {
    question: "Will DRM lower my glucose, A1C, weight, or medication needs?",
    answer:
      "DRM does not promise any medical or weight outcome.\n\nIt provides educational tools for daily actions, meals, movement, logging, learning, and preparing for healthcare conversations. Individual health decisions remain between you and your qualified healthcare professional.",
  },
  {
    question: "Do I have to complete every daily action and use every tool?",
    answer: "No. DRM is self-guided. Use the tools that fit your needs and routine.",
  },
  {
    question: "Is DRM for Type 1 diabetes?",
    answer: "No. DRM is designed for adults managing Type 2 diabetes or prediabetes.",
  },
  {
    question: "When do workouts become available?",
    answer:
      "Guided workouts begin unlocking from Day 29. The membership includes other daily actions, meal tools, tracking, educational content, and reporting tools before then.",
  },
  {
    question: "When does my access begin?",
    answer: "Your access begins after your payment is confirmed.",
  },
  {
    question: "What should I do in an emergency?",
    answer:
      "Do not use DRM for emergency help. Contact your local emergency services or an appropriate healthcare professional.",
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
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                            {faq.answer}
                          </p>
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

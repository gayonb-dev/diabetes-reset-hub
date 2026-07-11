import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const faqs = [
    {
      question: "What exactly am I paying for at $27?",
      answer:
        "Your $27 unlocks immediate access to the Diabetes Reset Method membership: the 7-Day Reset Sprint, the recipe and plate-method library (unlocks Day 6), expert Q&A, and 14 days of full access to everything. After those 14 days the membership renews at $67/month — unless you cancel before day 15.",
    },

    {
      question: "What happens after my 14 days of full access?",
      answer:
        "If you do nothing, your membership continues at $67/month, charged automatically. You can cancel anytime before day 15 from your member dashboard — one click, no call required, no email required. If you cancel inside the 14 days, no monthly charges are ever made and you still keep your $27 7-Day Reset program.",
    },
    {
      question: "How do I cancel?",
      answer:
        "In the app: Settings → Billing → Cancel. One click, done, confirmation on screen. You keep full access until your period ends, and the 30-day money-back guarantee applies to every charge.",
    },
    {
      question: "Is there a money-back guarantee?",
      answer:
        "Yes — we offer a 30-day money-back guarantee on every charge, including the initial $27 and any monthly renewal. Email Info@diabetesresetmethod.com within 30 days of the charge and we'll refund it in full within 5 business days. No hoops, no questions, no need to call.",
    },

    {
      question: "Do I need special foods, supplements, or a gym?",
      answer:
        "No. Everything uses real food from your regular grocery store and simple movements you can do at home. No equipment, no supplements, no fads.",
    },
    {
      question: "Can I do this while taking diabetes medication?",
      answer:
        "Yes. The membership is designed to complement your medical care, not replace it. Always consult your doctor before changing any medications. Many members work with their doctor to adjust as their numbers improve.",
    },
    {
      question: "Is this for Type 1 Diabetes?",
      answer:
        "No. The Diabetes Reset Method is built specifically for Type 2 Diabetes and prediabetes.",
    },
    {
      question: "How do I log in after I sign up?",
      answer:
        "We use one-click magic-link login — no passwords to remember. Go to the login page, enter your email, and we'll send you a secure link.",
    },
    {
      question: "How much time does it take each day?",
      answer:
        "10–20 minutes a day. The Reset is built for busy people. If you can walk to your kitchen, you can do this.",
    },
  ];

  return (
    <section id="faq" className="bg-background py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <ScrollReveal>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-foreground mb-2">
            Questions? We've Got Answers.
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Straight answers about pricing, billing, and how the membership works.
          </p>
        </ScrollReveal>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <ScrollReveal key={index} delay={index * 0.05}>
              <div
                className={`bg-card rounded-xl border-2 transition-colors shadow-md ${
                  openIndex === index ? "border-primary" : "border-border hover:border-primary"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-heading font-semibold text-foreground pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

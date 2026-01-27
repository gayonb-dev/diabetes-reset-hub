import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const faqs = [
    {
      question: "I've tried everything—will this work?",
      answer: "Yes! The 5-Day Reset gives quick wins that build belief and momentum. It's specifically designed for people with diabetes, not a generic diet plan.",
    },
    {
      question: "Do I need special foods or a gym?",
      answer: "No. Real food, simple movement, home-based. Everything can be done with ingredients from your regular grocery store and exercises you can do at home.",
    },
    {
      question: "Can I do this with meds?",
      answer: "Yes, but consult your doctor before adjusting anything. The program complements medical care and should not replace professional medical advice.",
    },
    {
      question: "What's the time commitment?",
      answer: "10–20 minutes a day. We've designed this to fit into even the busiest schedules because we know you have a life to live.",
    },
    {
      question: "What's your refund policy?",
      answer: "We stand behind our program with a 30-day money-back guarantee. No questions asked. If you're not completely satisfied with your results, we'll refund your full $27 investment. We're confident you'll see real wins with the 5-Day Reset, but there's zero risk on your end.",
    },
  ];

  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-12">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`bg-card rounded-xl border-2 transition-colors shadow-md ${
                openIndex === index ? "border-primary" : "border-gray-100 hover:border-primary"
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-heading font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 flex-shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

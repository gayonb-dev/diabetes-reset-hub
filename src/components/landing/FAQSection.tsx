import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const faqs = [
    {
      question: "I've tried everything — will this actually work?",
      answer: "We get it. Most programs aren't built for diabetics. The 5-Day Reset is different — it's designed specifically for Type 2 Diabetes and prediabetes. You'll see real wins within the first 5 days because the actions are small, specific, and proven. Plus, with our 30-day money-back guarantee, there's zero risk.",
    },
    {
      question: "Do I need special foods or a gym membership?",
      answer: "Not at all. Everything uses real food from your regular grocery store and simple movements you can do at home — no equipment needed. If you can walk to your kitchen, you can do this program.",
    },
    {
      question: "Can I do this while taking medications?",
      answer: "Yes — this program is designed to complement your medical care, not replace it. Always consult your doctor before making changes to medications. Many participants have worked with their doctors to adjust medications as their health improved.",
    },
    {
      question: "How much time does it take each day?",
      answer: "Just 10–20 minutes a day for 5 days. That's it. We designed this to fit the busiest schedules because we know your life doesn't stop for a health program.",
    },
    {
      question: "What happens after the 5 days?",
      answer: "After seeing your results, you can continue your journey with our 6-Week Reset or 12-Week Transformation programs. And your $27 investment is credited toward the 6-Week Reset — so you're not paying extra, you're getting a head start.",
    },
    {
      question: "What if it doesn't work for me?",
      answer: "We stand behind this program with a 30-day money-back guarantee. No questions asked, no hoops to jump through. If you don't see results, email us and we'll refund every penny. We're that confident it works.",
    },
  ];

  return (
    <section className="bg-background py-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-2">
          Got Questions? We've Got Answers.
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Still on the fence? These might help.
        </p>

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
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
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

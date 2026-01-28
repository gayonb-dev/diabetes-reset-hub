import { X, Check, ArrowRight } from "lucide-react";

const ProblemPromiseSection = () => {
  const doesntWork = [
    "Diets built for everyone, not for diabetics",
    "Meds mask symptoms but don't fix the cause",
    "Overwhelming plans kill momentum",
  ];

  return (
    <section className="bg-background py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-8">
          Why Most Plans Fail
          <br />
          <span className="text-gray-700">(and What Actually Works)</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* What Doesn't Work */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <X className="h-6 w-6 text-destructive" />
              <h3 className="font-heading font-semibold text-lg">What Doesn't Work</h3>
            </div>
            <ul className="space-y-3">
              {doesntWork.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <X className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What Does Work */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Check className="h-6 w-6 text-primary" />
              <h3 className="font-heading font-semibold text-lg">What Does Work</h3>
            </div>
            <p className="text-gray-700 mb-4">
              The 5-Day Diabetes Reset is different. For Type 2 Diabetes, prediabetes, and blood sugar control, you'll reset hydration, plate, and movement the diabetic-friendly way — so you can see real wins fast.
            </p>
            <a
              href="#pricing"
              className="inline-flex items-center text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              See the pricing
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemPromiseSection;

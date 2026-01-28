import { Flame, Sprout, Target } from "lucide-react";

const WhyThisWorksSection = () => {
  const reasons = [
    {
      icon: Flame,
      title: "Insulin & Inflammation",
      description: "Stabilize sugar swings.",
      gradient: "from-orange-100 to-orange-50",
    },
    {
      icon: Sprout,
      title: "Gut & Hormones",
      description: "Support better balance.",
      gradient: "from-green-100 to-green-50",
    },
    {
      icon: Target,
      title: "Accountability",
      description: "Momentum through tiny wins.",
      gradient: "from-blue-100 to-blue-50",
    },
  ];

  return (
    <section className="bg-background py-10">
      <div className="container mx-auto px-4">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl text-center text-gray-900 mb-2">
          Why This Works
        </h2>
        <p className="text-center text-gray-600 mb-8">(When Nothing Else Did)</p>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <div
                key={index}
                className={`bg-gradient-to-br ${reason.gradient} rounded-2xl p-8 text-center transition-transform hover:scale-105`}
              >
                <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">
                  {reason.title}
                </h3>
                <p className="text-gray-600">{reason.description}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-2xl p-8 text-center">
          <p className="font-heading font-bold text-2xl text-gray-900">
            No extremes. No starvation. Just results you can keep.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhyThisWorksSection;

import ScrollReveal from "./ScrollReveal";
import Vita from "@/components/vita/Vita";

const FounderSection = () => {
  return (
    <section className="bg-background py-12" aria-labelledby="founder-heading">
      <div className="container mx-auto px-4 max-w-3xl">
        <ScrollReveal>
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
            <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-2">
              A note from the founder
            </p>
            <h2
              id="founder-heading"
              className="font-heading font-bold text-3xl text-foreground mb-5"
            >
              Why I built Diabetes Reset Method
            </h2>

            <div className="flex flex-col sm:flex-row gap-6">
              <div className="shrink-0 mx-auto sm:mx-0">
                <Vita posture="encouraging" size={96} />
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  I built DRM around one belief: good information is not enough when it arrives as
                  another overwhelming list.
                </p>
                <p>
                  Adults managing Type 2 diabetes or prediabetes can have meals to consider, numbers
                  to record, movement to fit in, appointments to prepare for, and questions they do
                  not want to forget.
                </p>
                <p>
                  I wanted to put those practical pieces into one calmer place, somewhere you can
                  open the app, see the next useful action, and use the tools that fit your life.
                </p>
                <p>
                  I am not a healthcare professional, and DRM does not make medical decisions. Your
                  healthcare professional remains responsible for your care.
                </p>
                <p>
                  DRM exists to make the self-guided space between visits feel more organized,
                  practical, and human.
                </p>
                <p className="text-foreground font-medium">
                  Gayon
                  <br />
                  Founder, Diabetes Reset Method
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FounderSection;

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { ArrowRight, Zap, FileCode, Box, ChevronRight } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Natural Language Input",
    description: "Describe your application in plain English. Our NLP engine parses intent and extracts structured requirements.",
  },
  {
    icon: FileCode,
    title: "Blueprint Generation",
    description: "Your intent is converted into a deterministic blueprint—a JSON schema that defines components, routes, and data models.",
  },
  {
    icon: Box,
    title: "Controlled Generation",
    description: "The blueprint maps to predefined, tested code templates. No hallucinated JSX—only vetted implementations.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl"
        />

        <div className="container relative px-6 py-24">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-4xl text-center"
          >
            {/* Badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8"
            >
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Developer-First AI Framework
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6"
            >
              <span className="text-foreground">AI-Enabled</span>
              <br />
              <span className="gradient-text">WebCraft AI</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Convert natural-language intent into structured blueprints.
              Generate web applications from controlled, predefined capabilities—not arbitrary AI hallucinations.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button asChild variant="hero" size="xl">
                <Link to="/signup">
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="hero-secondary" size="xl">
                <Link to="/login">
                  Sign In
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs">Scroll to learn more</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronRight className="h-4 w-4 rotate-90" />
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 border-t border-border">
        <div className="container px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              How It Works
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              From Intent to Implementation
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A transparent, three-step pipeline that transforms your description into deployable code.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="group relative card-elevated card-interactive p-6"
                >
                  <div className="mb-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="absolute top-6 right-6 text-5xl font-bold text-muted/20">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-24 border-t border-border bg-muted/30">
        <div className="container px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
                Architecture
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                Deterministic, Not Probabilistic
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Unlike general-purpose AI code generators, our framework maps natural language to a fixed set of capabilities.
                The generated code comes from vetted templates—never hallucinated.
              </p>
              <ul className="space-y-3">
                {[
                  "NLP parses intent → structured JSON blueprint",
                  "Blueprint validates against capability registry",
                  "Code synthesis from tested component templates",
                  "Export to GitHub or download as ZIP",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-medium mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 gradient-primary opacity-10 blur-3xl rounded-3xl" />
              <div className="relative card-elevated p-6 code-block overflow-hidden">
                <pre className="text-xs sm:text-sm text-muted-foreground overflow-x-auto">
                  <code>{`{
  "intent": "Task management dashboard",
  "modules": {
    "auth": { "provider": "supabase" },
    "pages": ["dashboard", "tasks", "settings"],
    "components": ["TaskList", "TaskCard", "StatusBadge"],
    "dataModels": {
      "Task": {
        "fields": ["id", "title", "status", "assignee"]
      }
    }
  },
  "constraints": ["dark-theme", "responsive"]
}`}</code>
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-border">
        <div className="container px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto max-w-3xl text-center"
          >
            <div className="absolute inset-0 gradient-primary opacity-5 blur-3xl rounded-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Ready to Build?
              </h2>
              <p className="text-muted-foreground mb-8">
                Describe your application. Generate the blueprint. Export the code.
              </p>
              <Button asChild variant="hero" size="xl">
                <Link to="/signup">
                  Sign Up Now
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>WebCraft AI — Open for contribution</p>
            <p>Built for developers, by developers</p>
          </div>
        </div>
      </footer>
    </Layout>
  );
};

export default Index;

-- Create orders table for storing purchase information
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd' NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  product_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create leads table for email captures
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'free_meal_plan' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS policies for orders - only service role can manage
CREATE POLICY "Service role can manage orders" ON public.orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS policies for leads - allow inserts from anon, service role manages all
CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Service role can manage leads" ON public.leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_stripe_session_id ON public.orders(stripe_session_id);
CREATE INDEX idx_leads_email ON public.leads(email);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
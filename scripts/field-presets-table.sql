-- Create field_presets table for storing user custom field configurations
CREATE TABLE IF NOT EXISTS field_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_field_presets_user_id ON field_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_field_presets_created_at ON field_presets(created_at DESC);

-- Enable RLS
ALTER TABLE field_presets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own presets" ON field_presets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets" ON field_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets" ON field_presets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets" ON field_presets
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_field_presets_updated_at 
  BEFORE UPDATE ON field_presets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

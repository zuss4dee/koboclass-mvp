-- Add DELETE policy for hosts to delete their own classes
CREATE POLICY "Hosts can delete own classes"
  ON classes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

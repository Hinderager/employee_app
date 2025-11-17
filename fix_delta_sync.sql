-- Fix apply_material_deltas function to handle NULL when job doesn't exist
CREATE OR REPLACE FUNCTION apply_material_deltas(
  p_job_number TEXT,
  p_deltas JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_materials JSONB;
  v_new_materials JSONB;
  v_key TEXT;
  v_current_qty INTEGER;
  v_delta INTEGER;
  v_new_qty INTEGER;
BEGIN
  -- Get current materials or empty object if not exists
  SELECT COALESCE(materials, '{}'::jsonb)
  INTO v_current_materials
  FROM job_materials
  WHERE job_number = p_job_number;

  -- If no row exists, v_current_materials will be NULL, so default to empty object
  IF v_current_materials IS NULL THEN
    v_current_materials := '{}'::jsonb;
  END IF;

  -- Start with current materials
  v_new_materials := v_current_materials;

  -- Apply each delta
  FOR v_key, v_delta IN
    SELECT key, value::text::integer
    FROM jsonb_each_text(p_deltas)
  LOOP
    -- Get current quantity (0 if not exists)
    v_current_qty := COALESCE((v_current_materials->v_key)::text::integer, 0);

    -- Calculate new quantity
    v_new_qty := v_current_qty + v_delta;

    -- Remove item if quantity becomes 0 or negative
    IF v_new_qty <= 0 THEN
      v_new_materials := v_new_materials - v_key;
    ELSE
      -- Update with new quantity
      v_new_materials := jsonb_set(
        v_new_materials,
        ARRAY[v_key],
        to_jsonb(v_new_qty)
      );
    END IF;
  END LOOP;

  -- Upsert the row with new materials
  INSERT INTO job_materials (job_number, materials)
  VALUES (p_job_number, v_new_materials)
  ON CONFLICT (job_number)
  DO UPDATE SET
    materials = v_new_materials,
    updated_at = NOW();

  -- Return the new materials
  RETURN v_new_materials;
END;
$$;

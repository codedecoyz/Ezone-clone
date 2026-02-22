-- ============================================
-- FIX QR ATTENDANCE (Secure RPC)
-- ============================================

-- Function: Mark attendance via QR (Validates & Inserts)
CREATE OR REPLACE FUNCTION mark_attendance_qr(
  p_session_token VARCHAR,
  p_student_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  status_result VARCHAR
) AS $$
DECLARE
  v_session RECORD;
  v_existing_record RECORD;
BEGIN
  -- 1. Find session
  SELECT * INTO v_session
  FROM qr_sessions
  WHERE session_token = p_session_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid QR code'::TEXT, NULL::VARCHAR;
    RETURN;
  END IF;

  -- 2. Check if already marked
  SELECT * INTO v_existing_record
  FROM attendance_records
  WHERE student_id = p_student_id
    AND subject_id = v_session.subject_id
    AND date = v_session.date;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, 'Already marked for this session'::TEXT, v_existing_record.status;
    RETURN;
  END IF;

  -- 3. Determine Status (Check timeout)
  -- Note: We use NOW() vs valid_until
  IF NOW() > v_session.valid_until THEN
    -- Session expired / Late
    INSERT INTO attendance_records (student_id, subject_id, date, status, marked_at)
    VALUES (p_student_id, v_session.subject_id, v_session.date, 'late', NOW());
    
    RETURN QUERY SELECT TRUE, 'Marked as Late (scanned after timeout)'::TEXT, 'late'::VARCHAR;
  ELSE
    -- On time
    INSERT INTO attendance_records (student_id, subject_id, date, status, marked_at)
    VALUES (p_student_id, v_session.subject_id, v_session.date, 'present', NOW());
    
    RETURN QUERY SELECT TRUE, 'Marked Present'::TEXT, 'present'::VARCHAR;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

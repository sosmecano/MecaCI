import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate, AuthRequest, signToken, signRefreshToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendOtpSchema, registerProSchema, updateProSchema, availabilitySchema, verifyProOtpSchema } from '../schemas';
import { haversineDistance } from '../utils/haversine';
import { storeOtp, verifyOtp } from '../utils/otpStore';
import { sendSms, isSmsConfigured } from '../utils/sms';

const router = Router();

router.post('/register', validate(registerProSchema), async (req: Request, res: Response) => {
  try {
    const { phone, type, first_name, last_name, business_name, specialties, mobile_money_number } = req.body;
    const existing = await query('SELECT * FROM professionals WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Account already exists' });
    }

    const result = await query(
      `INSERT INTO professionals (phone, type, first_name, last_name, business_name, specialties, mobile_money_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
      [phone, type, first_name, last_name, business_name || null, specialties || [], mobile_money_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/send-otp', validate(sendOtpSchema), async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    const code = crypto.randomInt(100000, 999999).toString();
    const normalized = phone.replace(/[\s\-\+]/g, '');
    storeOtp(normalized, code);

    sendSms(normalized, `Votre code Mecanova pro : ${code}. Valable 2 minutes.`);

    const smsConfigured = isSmsConfigured();
    if (smsConfigured) {
      res.json({ message: 'Code sent', expires_in: 120 });
    } else {
      res.json({ message: 'Code sent', expires_in: 120, code });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', validate(verifyProOtpSchema), async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    const normalizedPhone = phone.replace(/[\s\-\+]/g, '');

    if (!verifyOtp(normalizedPhone, code)) {
      return res.status(400).json({ error: 'Code invalide ou expir' });
    }

    let result = await query('SELECT * FROM professionals WHERE phone = $1', [normalizedPhone]);
    if (result.rows.length === 0) {
      const numericPhone = parseFloat(normalizedPhone);
      if (!isNaN(numericPhone)) {
        result = await query('SELECT * FROM professionals WHERE phone = $1', [numericPhone]);
      }
    }
    if (result.rows.length === 0) {
      const existingUser = await query('SELECT id FROM users WHERE phone = $1', [normalizedPhone]);
      if (existingUser.rows.length > 0) {
        return res.status(403).json({ error: 'Ce numéro est un compte client. Utilisez l\'application client pour vous connecter.' });
      }
      return res.status(401).json({ error: 'Compte professionnel introuvable. Créez d\'abord un compte.' });
    }
    if (result.rows[0].status === 'pending') {
      return res.status(403).json({ error: 'Votre compte est en attente de validation par l\'administrateur.' });
    }
    const pro = result.rows[0];
    const token = signToken({ userId: pro.id, proId: pro.id, role: 'professional' });
    const refreshToken = await signRefreshToken(null, pro.id, 'professional');
    res.json({ token, refreshToken, professional: pro });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.use(authenticate);

router.get('/me', async (req: AuthRequest, res: Response) => {
  const result = await query('SELECT * FROM professionals WHERE id = $1', [req.proId]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

router.put('/me', validate(updateProSchema), async (req: AuthRequest, res: Response) => {
  const { business_name, first_name, last_name, city, specialties, zone_center_lat, zone_center_lng, zone_radius_km, hours, photo_url } = req.body;
  const result = await query(
    `UPDATE professionals SET
      business_name = COALESCE($1, business_name),
      first_name = COALESCE($2, first_name),
      last_name = COALESCE($3, last_name),
      city = COALESCE($4, city),
      specialties = COALESCE($5, specialties),
      zone_center_lat = COALESCE($6, zone_center_lat),
      zone_center_lng = COALESCE($7, zone_center_lng),
      zone_radius_km = COALESCE($8, zone_radius_km),
      hours = COALESCE($9, hours),
      photo_url = COALESCE($10, photo_url),
      updated_at = NOW()
    WHERE id = $11 RETURNING *`,
    [business_name, first_name, last_name, city, specialties, zone_center_lat, zone_center_lng, zone_radius_km, hours, photo_url, req.proId]
  );
  res.json(result.rows[0]);
});

router.put('/availability', validate(availabilitySchema), async (req: AuthRequest, res: Response) => {
  const { is_available } = req.body;
  const result = await query(
    'UPDATE professionals SET is_available = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [is_available, req.proId]
  );
  res.json(result.rows[0]);
});

router.get('/missions', async (req: AuthRequest, res: Response) => {
  const filter = req.query.status || 'all';
  let sql = `SELECT * FROM missions WHERE professional_id = $1`;
  const params: any[] = [req.proId];

  if (filter !== 'all') {
    sql += ' AND status = $2';
    params.push(filter);
  }
  sql += ' ORDER BY created_at DESC LIMIT 50';

  const result = await query(sql, params);
  for (const mission of result.rows) {
    if (mission.user_id) {
      const user = await query(`SELECT * FROM users WHERE id = $1`, [mission.user_id]);
      if (user.rows.length > 0) {
        mission.user_first_name = user.rows[0].first_name;
        mission.user_last_name = user.rows[0].last_name;
        mission.user_phone = user.rows[0].phone;
      }
    }
  }
  res.json(result.rows);
});

router.get('/nearby-missions', async (req: AuthRequest, res: Response) => {
  const pro = await query('SELECT * FROM professionals WHERE id = $1', [req.proId]);
  if (pro.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  const p = pro.rows[0];
  if (p.zone_center_lat == null || p.zone_center_lng == null || p.zone_radius_km == null) {
    return res.json([]);
  }
  const result = await query(
    `SELECT m.*, u.first_name as user_first_name, u.last_name as user_last_name
     FROM missions m JOIN users u ON m.user_id = u.id
     WHERE m.status = 'pending' AND m.professional_id IS NULL
     ORDER BY m.created_at DESC LIMIT 50`,
    []
  );
  const nearby = result.rows.filter((m: any) => {
    if (m.location_lat == null || m.location_lng == null) return false;
    const dist = haversineDistance(
      parseFloat(p.zone_center_lat), parseFloat(p.zone_center_lng),
      parseFloat(m.location_lat), parseFloat(m.location_lng)
    );
    return dist <= p.zone_radius_km;
  });
  res.json(nearby);
});

router.get('/earnings', async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT COUNT(*) as total_missions,
            COALESCE(SUM(professional_net), 0) as total_earnings
     FROM missions WHERE professional_id = $1 AND status = 'completed'
     AND EXTRACT(MONTH FROM completed_at) = EXTRACT(MONTH FROM NOW())`,
    [req.proId]
  );
  res.json(result.rows[0]);
});

export default router;

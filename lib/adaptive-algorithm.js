export async function adaptPlan(supabase, userId) {
  // Récupère les données de progression
  const { data: progress } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!progress) return;

  const today = new Date().toISOString().slice(0, 10);

  // Vérifie si on a déjà adapté aujourd'hui
  if (progress.last_adaptation_date === today) return;

  // Vérifie si on a assez de données (minimum 3 sessions)
  const sessionCount = (progress.session_dates || []).length;
  if (sessionCount < 3) return;

  let newAyahPerDay = progress.ayah_per_day ?? 2;
  let reason = null;

  // RÈGLE 1 — Taux de réussite en révision
  const scores = progress.last_revision_scores || [];
  if (scores.length >= 3) {
    const avg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (avg >= 80) {
      newAyahPerDay = Math.min(6, newAyahPerDay + 1);
      reason = 'Tu révises excellemment — on accélère le rythme.';
    } else if (avg < 50) {
      newAyahPerDay = Math.max(1, newAyahPerDay - 1);
      reason = 'Tu as du mal avec les révisions — on ralentit un peu.';
    }
  }

  // RÈGLE 2 — Streak cassé 2 fois en 7 jours
  const recentDates = (progress.session_dates || []).slice(-7);
  const missedDays = 7 - recentDates.length;
  if (missedDays >= 2) {
    newAyahPerDay = Math.max(1, newAyahPerDay - 1);
    reason = 'Quelques jours manqués — on allège la charge pour reprendre confiance.';
  }

  // RÈGLE 3 — Streak parfait 7 jours
  if (recentDates.length === 7) {
    newAyahPerDay = Math.min(6, newAyahPerDay + 1);
    reason = 'Une semaine parfaite — tu mérites un rythme plus soutenu.';
  }

  // RÈGLE 4 — Session trop courte (moins de 3 minutes)
  if (progress.session_duration_seconds > 0 && progress.session_duration_seconds < 180) {
    newAyahPerDay = Math.min(6, newAyahPerDay + 1);
    reason = 'Tu vas vite — on augmente la charge.';
  }

  // RÈGLE 5 — Session trop longue (plus de 20 minutes)
  if (progress.session_duration_seconds > 1200) {
    newAyahPerDay = Math.max(1, newAyahPerDay - 1);
    reason = 'Les sessions sont longues — on réduit pour rester confortable.';
  }

  // RÈGLE 6 — Difficulté des ayats
  if (progress.last_session_difficulty >= 4) {
    newAyahPerDay = Math.max(1, newAyahPerDay - 1);
    reason = 'Les ayats sont difficiles — on réduit la charge.';
  } else if (progress.last_session_difficulty > 0 && progress.last_session_difficulty <= 2) {
    newAyahPerDay = Math.min(6, newAyahPerDay + 1);
    reason = 'Les ayats sont faciles — on accélère.';
  }

  // Si le rythme a changé on met à jour
  if (newAyahPerDay !== progress.ayah_per_day) {
    await supabase
      .from('progress')
      .update({
        ayah_per_day: newAyahPerDay,
        last_adaptation_date: today,
      })
      .eq('user_id', userId);

    // Met aussi à jour la table plans
    await supabase
      .from('plans')
      .update({ ayah_per_day: newAyahPerDay })
      .eq('user_id', userId);
  }
}

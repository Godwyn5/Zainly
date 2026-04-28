function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function adaptPlan(supabase, userId) {
  // Récupère les données de progression et du plan en parallèle
  const [{ data: progress }, { data: plan }] = await Promise.all([
    supabase.from('progress').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('plans').select('id, ayah_per_day').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!progress) return;

  const today = localDateStr();

  // Vérifie si on a déjà adapté aujourd'hui
  if (progress.last_adaptation_date === today) return;

  // Vérifie si on a assez de données (minimum 3 sessions)
  const sessionCount = (progress.session_dates || []).length;
  if (sessionCount < 3) {
    await supabase.from('progress').update({ last_adaptation_date: today }).eq('user_id', userId);
    return;
  }

  // L71 — Lire ayah_per_day depuis plans en priorité
  const currentAyahPerDay = plan?.ayah_per_day ?? progress.ayah_per_day ?? 2;
  // The user's chosen pace is the hard ceiling — adaptation never exceeds it
  const paceCeiling = currentAyahPerDay;
  let newAyahPerDay = currentAyahPerDay;
  let reason = '';

  // RÈGLE 1 — Taux de réussite en révision
  const scores = progress.last_revision_scores || [];
  if (scores.length >= 3) {
    const avg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (avg >= 80) {
      newAyahPerDay = Math.min(paceCeiling, newAyahPerDay + 1);
      reason = 'Tu révises excellemment — on accélère le rythme.';
    } else if (avg < 50) {
      newAyahPerDay = Math.max(1, newAyahPerDay - 1);
      reason = 'Tu as du mal avec les révisions — on ralentit un peu.';
    }
  }

  // RÈGLE 2 — Jours manqués sur les 7 derniers jours calendaires (hors aujourd'hui)
  const last7Days = [];
  for (let i = 6; i >= 1; i--) {  // i>=1: exclut aujourd'hui (session peut ne pas être encore faite)
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(localDateStr(d));
  }
  const sessionDatesSet = new Set(progress.session_dates || []);
  const missedDays = last7Days.filter(d => !sessionDatesSet.has(d)).length;
  const perfectWeek = last7Days.every(d => sessionDatesSet.has(d));
  if (perfectWeek) {
    newAyahPerDay = Math.min(paceCeiling, newAyahPerDay + 1);
    reason = reason ? reason + ' + Semaine parfaite.' : 'Une semaine parfaite — tu mérites un rythme plus soutenu.';
  } else if (missedDays >= 2) {
    newAyahPerDay = Math.max(1, newAyahPerDay - 1);
    reason = reason ? reason + ' + Jours manqués.' : 'Quelques jours manqués — on allège la charge pour reprendre confiance.';
  }

  // RÈGLE 4 supprimée (L70) — session courte ne signifie pas facilité
  // RÈGLE 5 supprimée — session_duration_seconds non persisté en DB

  // RÈGLE 6 — Difficulté des ayats
  if (progress.last_session_difficulty >= 4) {
    newAyahPerDay = Math.max(1, newAyahPerDay - 1);
    reason = reason ? reason + ' + Ayats difficiles.' : 'Les ayats sont difficiles — on réduit la charge.';
  } else if (progress.last_session_difficulty > 0 && progress.last_session_difficulty <= 2) {
    newAyahPerDay = Math.min(paceCeiling, newAyahPerDay + 1);
    reason = reason ? reason + ' + Ayats faciles.' : 'Les ayats sont faciles — on accélère.';
  }

  // L68 — Limiter la variation à ±1 par adaptation, sans jamais dépasser le rythme choisi
  newAyahPerDay = Math.max(currentAyahPerDay - 1, Math.min(paceCeiling, newAyahPerDay));

  // L72+L73+L74 — Toujours mettre à jour last_adaptation_date, en parallèle, avec try/catch
  try {
    if (newAyahPerDay !== currentAyahPerDay) {
      const planUpdates = [
        supabase.from('progress').update({ last_adaptation_date: today, last_adaptation_reason: reason }).eq('user_id', userId),
      ];
      if (plan?.id) planUpdates.push(supabase.from('plans').update({ ayah_per_day: newAyahPerDay }).eq('id', plan.id));
      await Promise.all(planUpdates);
    } else {
      await supabase.from('progress').update({ last_adaptation_date: today }).eq('user_id', userId);
    }
  } catch (err) {
    console.error('[adaptPlan] update error:', err);
  }
}

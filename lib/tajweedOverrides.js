/**
 * Manual tajweed segment overrides — priority over quran_tajweed.json.
 *
 * Entry format: { type: 'tajweed' | 'no_rule', segments: [...] }
 *   type:'tajweed'  → ayat has colored rules to display
 *   type:'no_rule'  → ayat is covered but reads naturally (no rule to highlight)
 *
 * Raw array entries (legacy) are treated as type:'tajweed' by the resolver.
 */
export const TAJWEED_OVERRIDES = {
  "108_1": { type: 'tajweed', segments: [{"text":"إِ","rule":null},{"text":"نَّآ","rule":"ghunna"},{"text":" أَعۡطَيۡ","rule":null},{"text":"نَٰ","rule":"madd"},{"text":"كَ ٱلۡكَوۡثَرَ","rule":null}] },
  "108_2": { type: 'no_rule', segments: [{"text":"فَصَلِّ لِرَبِّكَ وَٱنۡحَرۡ","rule":null}] },
  "108_3": { type: 'tajweed', segments: [{"text":"إِ","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":" شَانِئَكَ هُوَ ٱلۡأَبۡتَرُ","rule":null}] },
  "109_1": { type: 'tajweed', segments: [{"text":"قُلۡ ","rule":null},{"text":"يَـٰٓ","rule":"madd"},{"text":"أَيُّهَا ٱلۡكَٰفِرُونَ","rule":null}] },
  "109_2": { type: 'tajweed', segments: [{"text":"لَآ","rule":"madd"},{"text":" أَعۡبُدُ مَا تَعۡبُدُو","rule":null},{"text":"نَ","rule":"ghunna"}] },
  "109_3": { type: 'tajweed', segments: [{"text":"وَ","rule":null},{"text":"لَآ","rule":"madd"},{"text":" أَنتُمۡ ","rule":null},{"text":"عَ","rule":"madd"},{"text":"ٰبِدُونَ م","rule":null},{"text":"َآ","rule":"madd"},{"text":" أَعۡبُدُ","rule":null}] },
  "109_4": { type: 'tajweed', segments: [{"text":"وَ","rule":null},{"text":"لَآ","rule":"madd"},{"text":" أَنَا۠ ","rule":null},{"text":"عَا","rule":"madd"},{"text":"بِدٞ مَّا عَبَدتُّمۡ","rule":null}] },
  "109_5": { type: 'tajweed', segments: [{"text":"وَ","rule":null},{"text":"لَآ","rule":"madd"},{"text":" أَنتُمۡ ","rule":null},{"text":"عَ","rule":"madd"},{"text":"ٰبِدُونَ م","rule":null},{"text":"َآ","rule":"madd"},{"text":" أَعۡبُدُ","rule":null}] },
  "109_6": { type: 'no_rule', segments: [{"text":"لَكُمۡ دِينُكُمۡ وَلِيَ دِينِ","rule":null}] },
  "110_1": { type: 'tajweed', segments: [{"text":"إِذَا ج","rule":null},{"text":"َآء","rule":"madd"},{"text":"َ نَصۡرُ ٱللَّهِ وَٱلۡفَتۡحُ","rule":null}] },
  "110_2": { type: 'tajweed', segments: [{"text":"وَرَأَيۡتَ ٱل","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":"اسَ يَدۡخُلُو","rule":null},{"text":"نَ","rule":"ghunna"},{"text":" فِي دِينِ ٱللَّهِ أَفۡوَاجٗا","rule":null}] },
  "110_3": { type: 'tajweed', segments: [{"text":"فَسَبِّحۡ بِحَمۡدِ رَبِّكَ وَٱسۡتَغۡفِرۡهُۚ إِ","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":"هُۥ كَانَ تَوَّابَۢا","rule":null}] },
  "111_1": { type: 'tajweed', segments: [{"text":"تَبَّتۡ يَد","rule":null},{"text":"َآ","rule":"madd"},{"text":" أَبِي لَهَبٖ وَتَبَّ","rule":null}] },
  "111_2": { type: 'tajweed', segments: [{"text":"مَآ","rule":"madd"},{"text":" أَغۡنَىٰ عَنۡهُ مَالُهُۥ وَمَا كَسَبَ","rule":null}] },
  "111_3": { type: 'tajweed', segments: [{"text":"سَيَصۡل","rule":null},{"text":"َىٰ","rule":"madd"},{"text":" نَارٗا ذَاتَ لَهَبٖ","rule":null}] },
  "111_4": { type: 'tajweed', segments: [{"text":"وَٱمۡرَأَتُهُۥ حَ","rule":null},{"text":"مَّ","rule":"ghunna"},{"text":"الَةَ ٱلۡحَطَبِ","rule":null}] },
  "111_5": { type: 'tajweed', segments: [{"text":"فِي جِيدِهَا حَبۡلٞ ","rule":null},{"text":"مِّن","rule":"ghunna"},{"text":" مَّسَدِۭ","rule":null}] },
  "112_1": { type: 'no_rule', segments: [{"text":"قُلۡ هُوَ ٱللَّهُ أَحَدٌ","rule":null}] },
  "112_3": { type: 'tajweed', segments: [{"text":"لَمۡ يَلِدۡ وَلَمۡ ","rule":null},{"text":"يُو","rule":"madd"},{"text":"لَدۡ","rule":null}] },
  "112_4": { type: 'no_rule', segments: [{"text":"وَلَمۡ يَكُن لَّهُۥ كُفُوًا أَحَدُۢ","rule":null}] },
  "113_1": { type: 'no_rule', segments: [{"text":"قُلۡ أَعُوذُ بِرَبِّ ٱلۡفَلَقِ","rule":null}] },
  "113_2": { type: 'tajweed', segments: [{"text":"مِ","rule":null},{"text":"ن ش","rule":"ikhfa"},{"text":"َرِّ مَا خَلَقَ","rule":null}] },
  "113_3": { type: 'tajweed', segments: [{"text":"وَمِ","rule":null},{"text":"ن ش","rule":"ikhfa"},{"text":"َرِّ غَاسِقٍ إِذَا وَقَبَ","rule":null}] },
  "113_4": { type: 'tajweed', segments: [{"text":"وَمِ","rule":null},{"text":"ن ش","rule":"ikhfa"},{"text":"َرِّ ٱلۡنَّفَّـٰثَٰتِ فِي ٱلۡعُقَدِ","rule":null}] },
  "113_5": { type: 'tajweed', segments: [{"text":"وَمِ","rule":null},{"text":"ن ش","rule":"ikhfa"},{"text":"َرِّ حَاسِدٍ إِذَا حَسَدَ","rule":null}] },
  "114_1": { type: 'tajweed', segments: [{"text":"قُلۡ أَعُوذُ بِرَبِّ ٱل","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":"اسِ","rule":null}] },
  "114_2": { type: 'tajweed', segments: [{"text":"مَلِكِ ٱل","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":"اسِ","rule":null}] },
  "114_3": { type: 'tajweed', segments: [{"text":"إِل","rule":null},{"text":"َٰ","rule":"madd"},{"text":"هِ ٱل","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":"اسِ","rule":null}] },
  "114_4": { type: 'tajweed', segments: [{"text":"مِ","rule":null},{"text":"ن ش","rule":"ikhfa"},{"text":"َرِّ ٱلۡوَسۡوَاسِ ٱلۡخَ","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":"اسِ","rule":null}] },
  "114_5": { type: 'tajweed', segments: [{"text":"ٱلَّذِي يُوَسۡوِسُ فِي صُدُورِ ٱل","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":"اسِ","rule":null}] },
  "114_6": { type: 'tajweed', segments: [{"text":"مِنَ ٱلۡجِ","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":"ةِ وَٱل","rule":null},{"text":"نَّ","rule":"ghunna"},{"text":"اسِ","rule":null}] },
};

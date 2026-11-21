/* Kora Challenge — إضافات كارير مود (الواجهة)
   ───────────────────────────────────────────
   • المؤتمرات الصحفية الكاملة (بعد الجوايز، الانتقال لمنافس، الاعتزال الدولي، العودة...)
   • شاشة قرار الاعتزال الدولي (من سن 29، كل سنة) والعودة للمنتخب
   • شاشة العودة من الاعتزال (اختيار فترة الراحة + عروض الأندية)
   • زرار "محاكاة الماتش" وربطه بالإنجن
   بيتحمّل قبل careermode.js وبيستلم الأدوات منه عن طريق KoraCMX.bind(api)                     */
(function (root) {
  'use strict';
  let U = null;                                   // أدوات الواجهة (بتجيلنا من careermode.js)
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const bind = api => { U = api; };

  /* ══════════ المؤتمرات الصحفية ══════════ */
  /* كل سؤال: [نص السؤال, [[الإجابة, شهرة, رأي المدرب], ...]] */
  function bank(item, S) {
    const p = S.player, nat = p.nat, name = p.name;
    const cn = id => (U.club(id) ? U.club(id).ar : '');
    const T = {
      ballon: { title: 'مؤتمر الكرة الذهبية', qs: [
        ['مبروك الكرة الذهبية! إيه إحساسك وإنت ماسك أغلى جايزة في العالم؟', [['حلم عمري اتحقق، وبهديه لأهلي وللجماهير', 3, .05], ['الجايزة دي بتاعة الفريق كله قبل ما تكون ليا', 2, .12], ['كنت عارف إني هكسبها، اشتغلت عليها سنين', 2, -.1]]],
        ['فيه ناس شايفة إن في لاعيبة تانيين يستحقوها أكتر منك. ترد عليهم إزاي؟', [['بحترم كل المرشحين والأرقام بتتكلم', 1, .05], ['الملعب هو الحكم وأنا كسبت فيه', 2, -.05], ['مش هرد، شغلي هو ردي', 0, .03]]],
        ['إيه هدفك الجاي بعد الكرة الذهبية؟', [['أكسب دوري الأبطال وكأس العالم', 3, 0], ['أفضل متواضع وأكمّل شغل', 1, .1], ['أكسرها تاني وتالت', 2, -.05]]]] },
      euPlayer: { title: 'مؤتمر أفضل لاعب في أوروبا', qs: [
        ['اتختارت أفضل لاعب في أوروبا الموسم ده! كلمنا عن إحساسك.', [['فخور جدًا، أوروبا فيها أحسن لاعيبة العالم', 3, .05], ['الفضل لزمايلي ولمدربي', 2, .12], ['ده أقل حاجة أستحقها', 2, -.1]]],
        ['إيه سر مستواك الخرافي الموسم ده؟', [['شغل وانضباط وتدريب كل يوم', 2, .08], ['موهبة وتوفيق من ربنا', 1, 0], ['مفيش سر، أنا ببساطة الأفضل', 2, -.12]]]] },
      afPlayer: { title: 'مؤتمر أفضل لاعب في إفريقيا', qs: [
        ['اتتوّجت أفضل لاعب في إفريقيا! إيه رسالتك لجماهير القارة؟', [['القارة السمرا فيها مواهب كتير، وأنا واحد منهم', 3, .05], ['بهدي الجايزة لبلدي ' + nat, 3, .03], ['دي بداية، طموحي أكبر من كده', 1, -.03]]],
        ['هل بتفضّل اللعب مع المنتخب ولا النادي؟', [['المنتخب شرف، والنادي بيت', 2, .08], ['النادي هو اللي بيطوّرني', 0, .1], ['عايز أكسب كل حاجة مع الاتنين', 2, 0]]]] },
      awardLoss: { title: 'مؤتمر بعد الحفل', qs: [
        ['خسرت الكرة الذهبية بفارق بسيط. شايف إنك اتظلمت؟', [['لا، مبروك للفايز وهجتهد أكتر', 2, .08], ['كنت أستحقها لو الأرقام بتتحسب صح', 1, -.1], ['مش مهتم بالجوايز الفردية', 0, .05]]],
        ['هتحاول تاني الموسم الجاي؟', [['أكيد، وهبقى أقوى', 2, .05], ['هركز في بطولات الفريق', 1, .12], ['اسألني بعد الموسم', 0, 0]]]] },
      rival: { title: 'مؤتمر انتقال لمنافس' },
      intlRetire: { title: 'مؤتمر الاعتزال الدولي', qs: [
        [item.final ? 'انتهت فترة عودتك للمنتخب وهتعتزل دوليًا نهائيًا. إيه شعورك؟' : 'قررت تعتزل دوليًا في سن ' + p.age + ' بعد ' + (S.intl ? S.intl.caps : 0) + ' مباراة مع ' + nat + '. ليه دلوقتي؟', [['عايز أركز في ناديي وأحافظ على جسمي', 0, .1], ['حان الوقت أفسح الطريق للجيل الجديد', 3, 0], ['محتاج راحة ومش هقدر أدّي الأفضل للمنتخب', -1, 0]]],
        ['الجماهير كانت لسه محتاجاك، مش شايف إنك بتخذلها؟', [['قلبي هيفضل مع ' + nat + ' دايمًا', 3, 0], ['الاعتزال ده قراري الشخصي', -1, 0], ['قدّمت كل اللي عندي وبكل حب', 1, 0]]],
        ['إيه أجمل لحظة في مسيرتك مع المنتخب؟', [['أول مرة لبست فيها القميص', 2, 0], ['كل هدف سجلته عشان بلدي', 2, 0], ['الفوز الجماعي أهم من أي لحظة فردية', 1, .05]]]] },
      intlBack: { title: 'مؤتمر العودة للمنتخب', qs: [
        ['رجعت للمنتخب بعد ما اعتزلت دوليًا! ليه غيّرت رأيك؟', [['حبي للقميص أقوى من أي قرار', 3, 0], ['المدرب والجماهير طلبوا مني وماقدرتش أرفض', 2, 0], ['حسّيت إني لسه عندي الكتير', 1, -.03]]],
        ['الجماهير كانت زعلانة من اعتزالك. هتعوّضهم إزاي؟', [['بالأهداف والبطولات', 3, 0], ['بالتواضع والاجتهاد', 2, .05], ['مش لازم أعوّض حد', -1, 0]]],
        ['ومتى هتعتزل دوليًا نهائي؟', [['لما أحس إني مش قادر أفيد المنتخب', 1, 0], ['بعد ما أحقق حلم البطولة', 2, 0], ['سيبها للوقت', 0, 0]]]] },
      retire: { title: 'مؤتمر الاعتزال', qs: [
        ['اعتزلت الكورة في سن ' + p.age + '. إيه شعورك في اللحظة دي؟', [['خليط من الفخر والحزن، الكورة كانت حياتي', 3, 0], ['مرتاح، قدّمت كل اللي عندي', 2, 0], ['صعب أوصف، محتاج وقت', 0, 0]]],
        ['هل ناوي تشتغل مدرب؟', [['أيوه، عايز أكمّل في الكورة', 2, 0], ['محتاج راحة الأول', 0, 0], ['لسه مقررتش', 0, 0]]],
        ['رسالتك للجماهير اللي حبتك؟', [['إنتم السبب في كل حاجة وصلتلها', 3, 0], ['شكرًا على كل لحظة', 2, 0], ['هتشوفوني تاني قريب', 1, 0]]]] },
      comeback: { title: 'مؤتمر العودة من الاعتزال', qs: [
        ['رجعت من الاعتزال بعد ' + (item.brk || 1) + (item.brk > 2 ? ' سنين' : item.brk === 2 ? ' سنتين' : ' سنة') + ' وبعمر ' + p.age + '! الجماهير مش مصدقة.', [['الكورة في دمي ومقدرتش أبعد', 3, .03], ['حسّيت إن لسه ليا دور', 2, 0], ['ده تحدي جديد بالنسبالي', 1, 0]]],
        ['ناس شايفة إن عودتك مغامرة وممكن تضر تاريخك. ردك؟', [['التاريخ اتكتب والباقي بونص', 2, .05], ['هثبت للكل إنهم غلطانين', 2, -.05], ['مش هرد على أي حد', 0, 0]]],
        ['هتعتزل نهائي في سن ' + (S.comeback ? S.comeback.finalAge : '--') + '، صح؟', [['أيوه، دي المرة الأخيرة', 2, .05], ['لو جسمي استحمل ممكن أكمّل', 1, 0], ['القرار وقتها', 0, 0]]]] }
    };
    if (item.kind === 'rival') {
      const a = cn(item.from), b = cn(item.to), sev = item.level === 'derby' ? 1.5 : 1, ld = item.years >= 3;
      const f = v => Math.round(v < 0 ? v * sev : v);
      T.rival.qs = [
        ['إنت خذلت جماهير ' + a + (ld ? ' بعد ' + item.years + ' مواسم معاهم' : '') + ' وروحت ' + b + ' (' + item.name + ')! إيه تبريرك؟', [['قرار مهني صعب وبحترم الجماهير', f(0), .05], ['ده تحدي جديد في مسيرتي', f(1), 0], ['محدش يفهم ظروفي، هرد في الملعب', f(-2), -.1]]],
        ['هل الفلوس كانت السبب الأساسي؟', [['الفلوس مش كل حاجة، أنا عايز بطولات', f(1), 0], ['ساعدت طبعًا، ده شغلي', f(-2), 0], ['كلام العقود مع إدارتي', f(0), 0]]],
        ['إيه رسالتك لجماهير ' + a + '؟', [['هفضل أحترمكم وأفتكر حبكم طول عمري', f(2), 0], ['الكورة بيزنس والكل عارف ده', f(-2), 0], ['شكرًا، وهكون محترف لما أقابلكم', f(0), .05]]]];
    }
    return T[item.kind === 'award' ? item.award : item.kind];
  }

  function headline(kind, total, S) {
    const n = S.player.name, pos = total >= 4, neg = total <= -2;
    if (kind === 'rival') return pos ? ['«' + n + '» يكسب تعاطف الجماهير رغم الانتقال المثير', 'الصحافة: رد ناضج من النجم على أزمة الانتقال'] : neg ? ['غضب جماهيري: «' + n + '» يخذل عشاقه!', 'تصريحات نارية تُشعل الأزمة مع الجماهير'] : ['«' + n + '» يعتذر ويعد بالتألق مع ناديه الجديد', 'الجماهير منقسمة بعد المؤتمر'];
    return pos ? ['«' + n + '» يخطف القلوب بتصريحاته', 'الصحافة تُشيد بشخصية النجم'] : neg ? ['تصريحات «' + n + '» تثير الجدل', 'انتقادات واسعة لحديث النجم'] : ['مؤتمر هادئ لـ«' + n + '»', 'تصريحات متوازنة من النجم'];
  }

  let pressOpen = false;
  /* مؤتمر كامل: سلسلة أسئلة، كل واحد بنفس صندوق المؤتمر الحالي (اختيارات + إجابة حرة) */
  function pressConf(item, done) {
    const S = U.S, cfg = bank(item, S);
    if (!cfg || pressOpen) { if (done) done(); return; }
    pressOpen = true;
    const ov = el('div', 'px-press'), card = el('div', 'px-card'); ov.appendChild(card);
    const head = el('div', 'px-head'), mic = el('span', 'px-mic'); mic.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>';
    const ttl = el('div'); ttl.append(el('b', '', cfg.title), el('small', '', 'الصحافة بتسأل… ردك بيأثر على شهرتك'));
    const skip = el('button', 'cm-link', 'تخطي'); skip.type = 'button';
    head.append(mic, ttl, skip); card.appendChild(head);
    const dots = el('div', 'px-dots'); cfg.qs.forEach(() => dots.appendChild(el('i'))); card.appendChild(dots);
    const body = el('div', 'px-body'); card.appendChild(body);
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    let i = 0, total = 0;
    const finish = (skipped) => {
      if (!skipped) {
        const d = Math.round(total * 1.3);
        S.fame = clamp((S.fame || 0) + d, 0, 100); U.save();
        card.textContent = '';
        const hl = headline(item.kind, total, S);
        const news = el('div', 'px-news'); news.append(el('small', '', 'عناوين الصحف'), el('b', '', hl[0]), el('span', '', hl[1]));
        card.append(el('h3', 'px-sum', 'انتهى المؤتمر'), news, el('div', 'cm-note ' + (d > 0 ? 'up' : d < 0 ? 'down' : ''), 'الشهرة ' + (d > 0 ? '+' : '') + d + ' • رصيدك دلوقتي ' + S.fame + ' من 100'));
        const ok = el('button', 'cm-btn', 'تمام'); ok.type = 'button'; ok.addEventListener('click', close); card.appendChild(ok);
      } else close();
    };
    const close = () => { ov.remove(); document.body.style.overflow = ''; pressOpen = false; if (done) done(); };
    skip.addEventListener('click', () => finish(true));
    const next = () => {
      body.textContent = '';
      [].forEach.call(dots.children, (d, k) => d.className = k < i ? 'done' : k === i ? 'cur' : '');
      const [q, opts] = cfg.qs[i];
      const press = { ctx: item.kind, q: q, done: null, opts: opts.map(o => ({ t: o[0], fame: o[1], favor: o[2] })) };
      const box = U.pressBox(press, {
        title: 'سؤال ' + (i + 1) + ' من ' + cfg.qs.length,
        onDone: () => {
          const f = press.free ? press.free.fame : (press.opts[press.done] || {}).fame || 0; total += f;
          const nb = el('button', 'cm-btn', i + 1 < cfg.qs.length ? 'السؤال التالي' : 'إنهاء المؤتمر'); nb.type = 'button';
          nb.addEventListener('click', () => { i++; if (i < cfg.qs.length) next(); else finish(false); });
          body.appendChild(nb);
        }
      });
      body.appendChild(box);
    };
    next();
  }

  /* قايمة المؤتمرات المعلّقة (بتتفرّغ واحد ورا التاني) */
  function flushPress(done) {
    const S = U.S; if (!S) { if (done) done(); return; }
    const q = S.pendingPress || [];
    if (!q.length || pressOpen) { if (done && !pressOpen) done(); return; }
    const item = q.shift(); S.pendingPress = q; U.save();
    pressConf(item, () => flushPress(done));
  }
  /* مؤتمرات الجوايز: بعد الكرة الذهبية / أفضل لاعب أوروبا / أفضل لاعب إفريقيا */
  function queueAwardPress() {
    const S = U.S, aw = S.awards, yr = S.summary && S.summary.year;
    if (!aw || S.awardPressYear === yr) return false;
    S.awardPressYear = yr;
    const q = S.pendingPress || [];
    ['ballon', 'euPlayer', 'afPlayer'].forEach(k => { if (aw[k] && aw[k].mine) q.push({ kind: 'award', award: k }); });
    if (aw.ballon && !aw.ballon.mine && aw.ballon.myRank >= 2 && aw.ballon.myRank <= 3) q.push({ kind: 'award', award: 'awardLoss' });
    S.pendingPress = q; U.save();
    return q.length > 0;
  }

  /* ══════════ الاعتزال الدولي ══════════ */
  function renderIntl(box) {
    const S = U.S, E = U.E, p = S.player, due = E.intlAskDue(S), it = S.intl;
    box.textContent = '';
    const card = el('div', 'cm-card px-intl');
    const nt = U.club('nt_' + p.natCode);
    const top = el('div', 'px-intl-top'); top.append(U.badge(nt), el('div'));
    top.lastChild.append(el('small', '', 'موسم ' + (S.year + 1) + ' • عمرك ' + p.age), el('h2', 'cm-sum-title', due === 'back' ? 'المنتخب بيطلبك!' : 'قرار المنتخب'));
    card.appendChild(top);
    const g = el('div', 'cm-sum-grid');
    [['مباريات دولية', it.caps], ['أهداف', it.goals], ['أسيست', it.assists]].forEach(x => { const d = el('div', 'cm-stat'); d.append(el('small', '', x[0]), el('b', '', String(x[1]))); g.appendChild(d); });
    card.appendChild(g);
    const answer = ch => {
      const r = E.answerIntl(S, ch); if (!r) { U.render(); return; }
      if (r.retired) S.pendingPress = (S.pendingPress || []).concat([{ kind: 'intlRetire' }]);
      if (r.back) { S.pendingPress = (S.pendingPress || []).concat([{ kind: 'intlBack' }]); }
      U.save(); U.render();
    };
    if (due === 'back') {
      const pl = E.intlBackPlan(S);
      card.appendChild(el('p', 'cm-sub px-q', 'المدرب والجماهير عايزينك ترجع تلبس قميص ' + p.nat + '. لو وافقت هترجع وإنت عندك ' + pl.returnAge + ' سنة وهتعتزل دوليًا نهائي وإنت عندك ' + pl.finalAge + ' سنة (مفيش رجوع تاني).'));
      const a = el('button', 'cm-btn', 'أرجع للمنتخب'); a.type = 'button'; a.addEventListener('click', () => answer('back'));
      const b = el('button', 'cm-btn ghost', 'لأ، أفضل معتزل دوليًا'); b.type = 'button'; b.addEventListener('click', () => answer('stay'));
      card.append(a, b);
    } else {
      card.appendChild(el('p', 'cm-sub px-q', 'هل تعتزل اللعب مع ' + p.nat + ' دوليًا؟ السؤال بيظهر كل سنة من سن 29. لو اعتزلت مش هتشارك في استدعاءات وبطولات المنتخب (هتقدر ترجع مرة واحدة بس بعد سنة على الأقل).'));
      const a = el('button', 'cm-btn', 'نعم، أعتزل دوليًا'); a.type = 'button';
      a.addEventListener('click', () => U.confirm({ title: 'تعتزل دوليًا؟', message: 'هتسيب المنتخب في سن ' + p.age + ' بعد ' + it.caps + ' مباراة، وهيبقى فيه مؤتمر صحفي.', okText: 'أعتزل', cancelText: 'لأ' }).then(ok => { if (ok) answer('retire'); }));
      const b = el('button', 'cm-btn ghost', 'لأ، أكمّل مع المنتخب'); b.type = 'button'; b.addEventListener('click', () => answer('stay'));
      card.append(a, b);
    }
    box.appendChild(card);
  }

  /* ══════════ العودة من الاعتزال: عروض الأندية ══════════ */
  function renderComeback(box) {
    const S = U.S, E = U.E, cb = S.comeback;
    box.textContent = '';
    const card = el('div', 'cm-card');
    card.append(el('div', 'cm-sub', 'العودة من الاعتزال'), el('h2', 'cm-sum-title', 'رجعت وإنت عندك ' + S.player.age + ' سنة'));
    card.appendChild(el('div', 'cm-note up', 'هتعتزل نهائي في سن ' + cb.finalAge + ' • طاقتك دلوقتي ' + Math.floor(S.player.ovr)));
    box.appendChild(card);
    S.offers.forEach((o, i) => {
      const oc = U.club(o.clubId), row = el('div', 'cm-card cm-offer');
      row.appendChild(U.badge(oc));
      const info = el('div', 'info'); info.append(el('b', '', oc.ar), el('small', '', U.LG[o.league].ar), el('span', 'cm-fee', 'عقد حر • فرصة العودة'));
      row.appendChild(info);
      const b = el('button', 'cm-btn', 'وقّع'); b.type = 'button';
      b.addEventListener('click', () => { E.chooseOffer(S, i, Math.random); S.pointsGiven = false; U.save(); U.render(); });
      row.appendChild(b); box.appendChild(row);
    });
  }
  /* اختيار فترة الراحة قبل العودة (بيعرض سن الرجوع وسن الاعتزال النهائي) */
  function pickComeback() {
    const S = U.S, E = U.E, opts = E.comebackOptions(S);
    const w = el('div', 'px-cb');
    w.appendChild(el('h3', 'cm-sum-title', 'التراجع عن الاعتزال'));
    if (!opts.length) { w.appendChild(el('p', 'cm-sub', 'مفيش عودة متاحة: العمر كبير أو رجعت قبل كده.')); U.openModal(w, 'تمام'); return; }
    w.appendChild(el('p', 'cm-sub', 'اختار هتاخد راحة قد إيه. كل ما تتأخر الطاقة بتقل. العودة مرة واحدة بس.'));
    opts.forEach(o => {
      const b = el('button', 'cm-btn ghost px-cb-opt'); b.type = 'button';
      b.innerHTML = '<b>راحة ' + (o.brk === 1 ? 'سنة' : o.brk === 2 ? 'سنتين' : '3 سنين') + '</b><small>ترجع وإنت عندك ' + o.returnAge + ' سنة • تعتزل نهائي وإنت عندك ' + o.finalAge + ' • الطاقة ' + o.ovr + '</small>';
      b.addEventListener('click', () => {
        U.confirm({ title: 'ترجع من الاعتزال؟', message: 'هترجع وإنت عندك ' + o.returnAge + ' وتعتزل نهائي وإنت عندك ' + o.finalAge + '.', okText: 'أرجع', cancelText: 'لأ' }).then(ok => {
          if (!ok) return; document.getElementById('cmModal').hidden = true;
          E.unretire(S, o.brk, Math.random); U.save(); U.render();
        });
      });
      w.appendChild(b);
    });
    U.openModal(w, 'إلغاء');
  }

  /* ══════════ محاكاة الماتش ══════════ */
  const SIMPOS = { ST: 'ST', WG: 'ST', MF: 'MF', DF: 'DF', GK: 'GK' };
  function teamColor(id, avoidHue) {
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; h %= 360;
    if (avoidHue != null && Math.abs(((h - avoidHue + 540) % 360) - 180) > 150) h = (h + 150) % 360;
    return { h: h, c: 'hsl(' + h + ',62%,46%)' };
  }
  function simAvailable() {
    const S = U.S, E = U.E;
    if (!root.KoraMatchSim || S.expelled || (S.injury && S.injury.games > 0) || S.susp > 0 || S.seasonOver) return false;
    return !!(E.nextExtraInfo(S) || E.myFixtures(S).find(f => f.round === S.round + 1));
  }
  function simOpts(clubIdMe, oppId, home, label, extra) {
    const S = U.S, E = U.E, me = U.club(clubIdMe), opp = U.club(oppId);
    const mc = teamColor(me.id), oc = teamColor(opp.id, mc.h), mor = E.moraleOf ? E.moraleOf(S) : 60;
    return Object.assign({
      pos: SIMPOS[S.player.pos] || 'ST', ovr: S.player.ovr + (mor - 60) / 20, myStr: me.str + (E.strAdj ? E.strAdj(S, !!(E.nextExtraInfo(S)) || /المنتخب/.test(label || '')) : 0), oppStr: opp.str, myName: me.ar, oppName: opp.ar, playerName: S.player.name,
      skills: S.skills || {}, home: home, myColor: mc.c, oppColor: oc.c, label: label || '', stars: E.starsOf ? E.starsOf(S, oppId, 2) : []
    }, extra || {});
  }
  function startSim(done) {
    const S = U.S, E = U.E, due = E.nextExtraInfo(S);
    let o;
    if (due) o = simOpts(S.clubId, due.home === S.clubId ? due.away : due.home, due.home === S.clubId, due.label);
    else {
      const fx = E.myFixtures(S).find(f => f.round === S.round + 1); if (!fx) return;
      const home = fx.home === S.clubId; o = simOpts(S.clubId, home ? fx.away : fx.home, home, E.derbyOf(fx.home, fx.away) || '');
    }
    root.KoraMatchSim.open(o, res => { if (res) done(res); });
  }
  /* مباراة منتخب (من شاشة الاستدعاء) */
  function startNatSim(pm, natId, done) {
    const home = pm.home === natId;
    root.KoraMatchSim.open(simOpts(natId, home ? pm.away : pm.home, home, 'المنتخب • ' + (pm.stageText || '')), res => { if (res) done(res); });
  }

  root.KoraCMX = { bind: bind, pressConf: pressConf, flushPress: flushPress, queueAwardPress: queueAwardPress, renderIntl: renderIntl, renderComeback: renderComeback, pickComeback: pickComeback, simAvailable: simAvailable, startSim: startSim, startNatSim: startNatSim, teamColor: teamColor };
})(window);

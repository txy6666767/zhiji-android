(function () {
  "use strict";

  const DATA = window.STUDY_DATA;
  const LEGACY = window.GAO_DATA || {};
  const STORAGE_KEY = "zhiji-gaokao-study-v2";
  const API_KEY_STORAGE = "zhiji-gaokao-api-key-v2";
  const DAY_MS = 24 * 60 * 60 * 1000;
  const TIMER_CIRCUMFERENCE = 2 * Math.PI * 106;
  const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60, 120];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function nextGaokaoDate() {
    const now = new Date();
    const thisYear = new Date(now.getFullYear(), 5, 7);
    return dateKey(thisYear >= startOfDay(now) ? thisYear : new Date(now.getFullYear() + 1, 5, 7));
  }

  function currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function defaultState() {
    return {
      settings: {
        examDate: nextGaokaoDate(),
        targetScore: 620,
        currentScore: 510,
        dailyMinutes: 180,
        studyDays: 6,
        focusMinutes: 45,
        aiEndpoint: "",
        aiModel: "",
        aiProvider: "deepseek",
        tokenPrice: 2,
        reminderEvening: "20:00",
        reminderNight: "23:00"
      },
      weakSubjects: ["math", "english"],
      includedSubjects: DATA.subjects.map((subject) => subject.id),
      subjectPriority: DATA.subjects.map((subject) => subject.id),
      subjectGoals: {
        chinese: { current: 105, target: 120 },
        math: { current: 90, target: 120 },
        english: { current: 110, target: 125 },
        physics: { current: 65, target: 80 },
        chemistry: { current: 65, target: 80 },
        biology: { current: 75, target: 95 }
      },
      goalNote: "",
      plan: null,
      planCompletions: {},
      questionProgress: {},
      attempts: [],
      aiUsage: {
        totalTokens: 0,
        lastTokens: 0,
        balance: null,
        currency: "CNY",
        checkedAt: null
      },
      dailyMeta: {
        lastRefreshDate: null,
        sentReminders: []
      },
      customQuestions: [],
      selectedQuestionIds: [],
      taskGraph: {
        positions: {},
        edges: []
      },
      studyLog: [],
      focusSessions: [],
      activeQuiz: null,
      lastQuizResult: null,
      activeTimer: {
        durationSec: 45 * 60,
        remainingSec: 45 * 60,
        running: false,
        endAt: null,
        subjectId: "math",
        taskId: null
      },
      vocabProgress: {},
      customWords: [],
      createdAt: new Date().toISOString()
    };
  }

  function mergeState(saved) {
    const base = defaultState();
    if (!saved || typeof saved !== "object") return base;
    return {
      ...base,
      ...saved,
      settings: { ...base.settings, ...(saved.settings || {}) },
      weakSubjects: Array.isArray(saved.weakSubjects) ? saved.weakSubjects : base.weakSubjects,
      includedSubjects: Array.isArray(saved.includedSubjects)
        ? saved.includedSubjects
        : base.includedSubjects,
      subjectPriority: Array.isArray(saved.subjectPriority)
        ? saved.subjectPriority
        : base.subjectPriority,
      subjectGoals: {
        ...base.subjectGoals,
        ...(saved.subjectGoals || {})
      },
      planCompletions:
        saved.planCompletions && typeof saved.planCompletions === "object"
          ? saved.planCompletions
          : {},
      questionProgress:
        (() => {
          const progress =
            saved.questionProgress && typeof saved.questionProgress === "object"
              ? saved.questionProgress
              : {};
          Object.values(progress).forEach((item) => {
            item.correctCount = Number(item.correctCount || (item.mastered ? 1 : 0));
            item.incorrectCount = Number(item.incorrectCount || 0);
            item.errorCounts = item.errorCounts || {};
            item.reviewCount = Number(item.reviewCount || 0);
            if (!item.status) {
              item.status = item.mastered ? "review" : item.incorrectCount ? "learning" : "new";
            }
          });
          return progress;
        })(),
      attempts: Array.isArray(saved.attempts) ? saved.attempts : [],
      aiUsage: { ...base.aiUsage, ...(saved.aiUsage || {}) },
      dailyMeta: { ...base.dailyMeta, ...(saved.dailyMeta || {}) },
      customQuestions: Array.isArray(saved.customQuestions) ? saved.customQuestions : [],
      selectedQuestionIds: Array.isArray(saved.selectedQuestionIds)
        ? saved.selectedQuestionIds
        : [],
      taskGraph: {
        positions:
          saved.taskGraph && typeof saved.taskGraph.positions === "object"
            ? saved.taskGraph.positions
            : {},
        edges: Array.isArray(saved.taskGraph?.edges) ? saved.taskGraph.edges : []
      },
      studyLog: Array.isArray(saved.studyLog) ? saved.studyLog : [],
      focusSessions: Array.isArray(saved.focusSessions) ? saved.focusSessions : [],
      activeQuiz: saved.activeQuiz && typeof saved.activeQuiz === "object" ? saved.activeQuiz : null,
      lastQuizResult:
        saved.lastQuizResult && typeof saved.lastQuizResult === "object"
          ? saved.lastQuizResult
          : null,
      activeTimer: { ...base.activeTimer, ...(saved.activeTimer || {}) },
      vocabProgress:
        saved.vocabProgress && typeof saved.vocabProgress === "object"
          ? saved.vocabProgress
          : {},
      customWords: Array.isArray(saved.customWords) ? saved.customWords : []
    };
  }

  function loadState() {
    try {
      return mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch (error) {
      console.warn("State load failed", error);
      return defaultState();
    }
  }

  const state = loadState();
  const nativeAIRequests = new Map();
  window.onNativeAIResponse = function (requestId, statusCode, responseBody) {
    const request = nativeAIRequests.get(requestId);
    if (!request) return;
    nativeAIRequests.delete(requestId);
    if (Number(statusCode) < 200 || Number(statusCode) >= 300) {
      request.reject(new Error(`DeepSeek 接口返回 ${statusCode}：${String(responseBody).slice(0, 180)}`));
      return;
    }
    try {
      request.resolve(JSON.parse(responseBody));
    } catch (error) {
      request.reject(new Error("安卓原生请求返回了无法解析的内容。"));
    }
  };
  window.onNativeDeepSeekBalance = function (statusCode, responseBody) {
    const button = $("#refreshBalanceButton");
    if (button) {
      button.disabled = false;
      button.textContent = "检测余额";
    }
    try {
      if (Number(statusCode) < 200 || Number(statusCode) >= 300) {
        throw new Error(`余额接口返回 ${statusCode}`);
      }
      const data = JSON.parse(responseBody);
      const info = Array.isArray(data.balance_infos) ? data.balance_infos[0] : null;
      if (!info) throw new Error("没有账户余额信息");
      state.aiUsage.balance = Number(info.total_balance || 0);
      state.aiUsage.currency = info.currency || "CNY";
      state.aiUsage.checkedAt = new Date().toISOString();
      saveState();
      renderAIUsage();
      $("#balanceHelp").textContent = `余额更新时间：${new Date().toLocaleString("zh-CN")}；Token 数按单价估算。`;
      toast("DeepSeek 账户余额已更新。");
    } catch (error) {
      toast(`余额检测失败：${error.message}`, 4200);
    }
  };
  const ui = {
    page: "plan",
    activePlanDay: null,
    pack: currentMonthKey(),
    subjectFilter: "all",
    difficultyFilter: "all",
    typeFilter: "all",
    search: "",
    visibleLimit: 8,
    activeQuestionId: null,
    questionOpenedAt: null,
    answerRevealed: false,
    selectedOption: "",
    subjectivePending: false,
    quizIndex: 0,
    activeTaskId: null,
    taskConnectMode: false,
    taskConnectFrom: null,
    mapDrag: null,
    chatAttachments: [],
    pendingTaskPatch: null,
    pendingGoalChanges: null,
    wordQueue: null,
    editingGoal: false,
    wordIndex: null,
    wordRevealed: false,
    timerCompleting: false
  };

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      toast("保存失败，请先导出备份并释放浏览器空间。");
      console.error(error);
    }
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function startOfDay(value = new Date()) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function dateKey(value = new Date()) {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  }

  function dateTimeKey(value = new Date()) {
    const date = new Date(value);
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${dateKey(date).replaceAll("-", "")}T${h}${m}${s}`;
  }

  function addDays(value, amount) {
    const date = new Date(value);
    date.setDate(date.getDate() + amount);
    return date;
  }

  function daysBetween(a, b) {
    return Math.ceil((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
  }

  function formatShortDate(value) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      weekday: "short"
    }).format(new Date(value));
  }

  function formatMonth(pack) {
    const [year, month] = String(pack).split("-");
    return `${year}.${month}`;
  }

  function reviewMoment(daysAhead) {
    const date = addDays(new Date(), daysAhead);
    date.setHours(20, 0, 0, 0);
    return date.toISOString();
  }

  function toast(message, duration = 2800) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("is-visible");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("is-visible"), duration);
  }

  function subjectFor(id) {
    return DATA.subjectMap[id] || DATA.subjects[0];
  }

  function allQuestions() {
    return [...DATA.questions, ...state.customQuestions];
  }

  function questionById(id) {
    return allQuestions().find((item) => item.id === id);
  }

  function selectedQuestions() {
    return state.selectedQuestionIds.map(questionById).filter(Boolean);
  }

  function isQuestionDue(id) {
    const progress = state.questionProgress[id];
    if (!progress?.nextReviewAt) return false;
    return startOfDay(progress.nextReviewAt) <= startOfDay(new Date());
  }

  function masteryLabel(id) {
    const progress = state.questionProgress[id];
    if (!progress) return "未作答";
    if (progress.status === "stable") return "稳定掌握";
    if (progress.status === "verified") return "已复测";
    if (progress.correctCount > 0) return "待复测";
    if (progress.incorrectCount > 0) return "需订正";
    return "学习中";
  }

  function latestAttempt(questionId) {
    return state.attempts
      .filter((item) => item.questionId === questionId)
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))[0] || null;
  }

  function dueQuestions() {
    return allQuestions()
      .filter((item) => isQuestionDue(item.id))
      .sort(
        (a, b) =>
          new Date(state.questionProgress[a.id]?.nextReviewAt || 0) -
          new Date(state.questionProgress[b.id]?.nextReviewAt || 0)
      );
  }

  function packKeys() {
    return Array.from(new Set([...allQuestions().map((item) => item.pack), currentMonthKey()])).sort().reverse();
  }

  function setPage(name) {
    ui.page = name;
    $$(".page").forEach((page) => page.classList.toggle("is-active", page.dataset.page === name));
    $$(".nav-item").forEach((item) =>
      item.classList.toggle("is-active", item.dataset.pageJump === name)
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "plan") renderPlan();
    if (name === "bank") renderBank();
    if (name === "focus") renderFocus();
    if (name === "ai") renderAIConfig();
    if (name === "overview") renderOverview();
  }

  function aiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  }

  function aiConfigured() {
    return Boolean(state.settings.aiEndpoint && state.settings.aiModel && aiKey());
  }

  function updateGoalAvailability() {
    const ready = aiConfigured();
    $("#aiRequiredBadge").textContent = ready ? "AI 已配置" : "需配置 AI";
    $("#aiRequiredBadge").classList.toggle("ready", ready);
    $("#generatePlanButton").textContent = ready ? "✦ AI 生成并开始执行" : "去配置 AI 后生成计划";
    $("#goalMini").hidden = !state.plan;
    $("#goalMiniValue").textContent = `${state.settings.targetScore} 分`;
  }

  function renderWeakChoices() {
    $("#weakSubjects").innerHTML = DATA.subjects
      .map(
        (subject) => `
          <label class="subject-choice">
            <input type="checkbox" value="${subject.id}" ${state.weakSubjects.includes(subject.id) ? "checked" : ""} />
            <span>${escapeHTML(subject.name)}</span>
          </label>
        `
      )
      .join("");
  }

  function renderSubjectPriority() {
    const order = state.subjectPriority.filter((id) => DATA.subjectMap[id]);
    DATA.subjects.forEach((subject) => {
      if (!order.includes(subject.id)) order.push(subject.id);
    });
    state.subjectPriority = order;
    $("#subjectPriorityList").innerHTML = order
      .map((id, index) => {
        const subject = subjectFor(id);
        const checked = state.includedSubjects.includes(id);
        return `
          <div class="priority-row" data-priority-subject="${id}">
            <label>
              <input type="checkbox" data-subject-include="${id}" ${checked ? "checked" : ""} />
              <span class="priority-check">✓</span>
              <strong>${escapeHTML(subject.name)}</strong>
            </label>
            <span class="priority-rank">优先级 ${index + 1}</span>
            <button type="button" data-priority-up="${id}" aria-label="提高${subject.name}优先级" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-priority-down="${id}" aria-label="降低${subject.name}优先级" ${index === order.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        `;
      })
      .join("");
  }

  function renderSubjectGoals() {
    $("#subjectGoalGrid").innerHTML = DATA.subjects
      .map((subject) => {
        const goal = state.subjectGoals[subject.id] || { current: 0, target: 0 };
        return `
          <div class="subject-goal-row">
            <strong>${escapeHTML(subject.name)}</strong>
            <label><input type="number" min="0" max="150" step="1" data-subject-current="${subject.id}" value="${Number(goal.current) || 0}" aria-label="${subject.name}当前估分" /></label>
            <label><input type="number" min="0" max="150" step="1" data-subject-target="${subject.id}" value="${Number(goal.target) || 0}" aria-label="${subject.name}目标分" /></label>
          </div>
        `;
      })
      .join("");
  }

  function populateGoalForm() {
    $("#goalExamDate").value = state.settings.examDate;
    $("#goalTargetScore").value = String(state.settings.targetScore);
    $("#goalCurrentScore").value = String(state.settings.currentScore);
    $("#goalDailyMinutes").value = String(state.settings.dailyMinutes);
    $("#goalStudyDays").value = String(state.settings.studyDays);
    $("#goalFocusMinutes").value = String(state.settings.focusMinutes);
    $("#goalNote").value = state.goalNote || "";
    renderWeakChoices();
    renderSubjectGoals();
    renderSubjectPriority();
  }

  function readGoalForm() {
    const weakSubjects = $$("#weakSubjects input:checked").map((input) => input.value);
    if (!state.includedSubjects.length) throw new Error("请至少选择一个参与计划的学科。");
    const subjectGoals = {};
    DATA.subjects.forEach((subject) => {
      const current = Number($(`[data-subject-current="${subject.id}"]`).value) || 0;
      const target = Number($(`[data-subject-target="${subject.id}"]`).value) || 0;
      if (current > 150 || target > 150 || target < current) {
        throw new Error(`${subject.name}目标分应不高于 150，且不能低于当前估分。`);
      }
      subjectGoals[subject.id] = { current, target };
    });
    const goal = {
      examDate: $("#goalExamDate").value,
      targetScore: Number($("#goalTargetScore").value),
      currentScore: Number($("#goalCurrentScore").value),
      dailyMinutes: Number($("#goalDailyMinutes").value),
      studyDays: Number($("#goalStudyDays").value),
      focusMinutes: Number($("#goalFocusMinutes").value),
      weakSubjects,
      subjectGoals,
      includedSubjects: state.includedSubjects.slice(),
      subjectPriority: state.subjectPriority.slice(),
      note: $("#goalNote").value.trim()
    };
    if (!goal.examDate) throw new Error("请选择高考日期。");
    if (daysBetween(new Date(), goal.examDate) < 0) throw new Error("高考日期不能早于今天。");
    if (!goal.targetScore || goal.targetScore > 750 || goal.targetScore <= goal.currentScore) {
      throw new Error("目标总分应高于当前估分，且不超过 750 分。");
    }
    if (goal.dailyMinutes < 30 || goal.studyDays < 1) throw new Error("请检查每日时间和每周学习天数。");
    return goal;
  }

  function saveGoal(goal) {
    state.settings.examDate = goal.examDate;
    state.settings.targetScore = goal.targetScore;
    state.settings.currentScore = goal.currentScore;
    state.settings.dailyMinutes = goal.dailyMinutes;
    state.settings.studyDays = goal.studyDays;
    state.settings.focusMinutes = goal.focusMinutes;
    state.weakSubjects = goal.weakSubjects;
    state.includedSubjects = goal.includedSubjects;
    state.subjectPriority = goal.subjectPriority;
    state.subjectGoals = goal.subjectGoals;
    state.goalNote = goal.note;
    if (!state.activeTimer.running) {
      state.activeTimer.durationSec = goal.focusMinutes * 60;
      state.activeTimer.remainingSec = goal.focusMinutes * 60;
    }
    saveState();
  }

  function stateSummary() {
    const planTasks = state.plan?.days?.flatMap((day) => day.tasks) || [];
    const completedTasks = planTasks.filter((task) => state.planCompletions[task.id]).length;
    const speed = learningSpeedData();
    return {
      examDate: state.settings.examDate,
      daysLeft: Math.max(0, daysBetween(new Date(), state.settings.examDate)),
      currentScore: state.settings.currentScore,
      targetScore: state.settings.targetScore,
      dailyMinutes: state.settings.dailyMinutes,
      studyDays: state.settings.studyDays,
      weakSubjects: state.weakSubjects.map((id) => subjectFor(id).name),
      includedSubjects: state.includedSubjects.map((id) => subjectFor(id).name),
      subjectPriority: state.subjectPriority
        .filter((id) => state.includedSubjects.includes(id))
        .map((id) => subjectFor(id).name),
      subjectGoals: DATA.subjects.map((subject) => ({
        name: subject.name,
        current: Number(state.subjectGoals[subject.id]?.current || 0),
        target: Number(state.subjectGoals[subject.id]?.target || 0),
        gap: Math.max(
          0,
          Number(state.subjectGoals[subject.id]?.target || 0) -
            Number(state.subjectGoals[subject.id]?.current || 0)
        ),
        weak: state.weakSubjects.includes(subject.id)
      })),
      goalNote: state.goalNote,
      planTasks: planTasks.length,
      completedTasks,
      planCompletionPercent: planTasks.length
        ? Math.round((completedTasks / planTasks.length) * 100)
        : 0,
      learningSpeedRatio: speed.ratio,
      learningSpeedRating: speed.ratioLabel,
      estimatedRemainingMinutes: speed.remainingMinutes,
      estimatedDaysToFinish: speed.daysNeeded,
      todayFocusMinutes: Math.round(todayFocusSeconds() / 60),
      subjects: DATA.subjects.map((subject) => {
        const subjectTasks = planTasks.filter((item) => item.subjectId === subject.id);
        return {
          name: subject.name,
          included: state.includedSubjects.includes(subject.id),
          priority: state.subjectPriority.indexOf(subject.id) + 1,
          totalTasks: subjectTasks.length,
          completedTasks: subjectTasks.filter((item) => state.planCompletions[item.id]).length,
          target: Number(state.subjectGoals[subject.id]?.target || 0),
          current: Number(state.subjectGoals[subject.id]?.current || 0)
        };
      })
    };
  }

  async function callAI(systemPrompt, userPrompt, attachments = []) {
    if (!aiConfigured()) throw new Error("请先在「助手」页配置 AI 接口、模型和密钥。");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 70000);
    try {
      const textFiles = attachments
        .filter((item) => item.text)
        .map((item) => `附件《${item.name}》：\n${String(item.text).slice(0, 18000)}`)
        .join("\n\n");
      const images = attachments.filter((item) => item.type?.startsWith("image/") && item.dataUrl);
      const finalUserText = `${userPrompt}${textFiles ? `\n\n${textFiles}` : ""}${attachments.some((item) => !item.text && !item.type?.startsWith("image/")) ? `\n\n另附文件：${attachments.filter((item) => !item.text && !item.type?.startsWith("image/")).map((item) => item.name).join("、")}` : ""}`;
      const userContent = images.length
        ? [
            { type: "text", text: finalUserText },
            ...images.map((item) => ({
              type: "image_url",
              image_url: { url: item.dataUrl }
            }))
          ]
        : finalUserText;
      const requestBody = JSON.stringify({
        model: state.settings.aiModel,
        temperature: 0.35,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ]
      });
      let data;
      if (window.ZhijiAndroid?.aiRequest) {
        const requestId = `native-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        data = await new Promise((resolve, reject) => {
          nativeAIRequests.set(requestId, { resolve, reject });
          window.ZhijiAndroid.aiRequest(
            requestId,
            state.settings.aiEndpoint,
            aiKey(),
            requestBody
          );
          setTimeout(() => {
            if (nativeAIRequests.has(requestId)) {
              nativeAIRequests.delete(requestId);
              reject(new Error("安卓原生 AI 请求超时。"));
            }
          }, 70000);
        });
      } else {
        const response = await fetch(state.settings.aiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiKey()}`
        },
        body: requestBody,
        signal: controller.signal
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`接口返回 ${response.status}${text ? `：${text.slice(0, 160)}` : ""}`);
      }
        data = await response.json();
      }
      if (data?.usage) {
        state.aiUsage.lastTokens = Number(data.usage.total_tokens || 0);
        state.aiUsage.totalTokens =
          Number(state.aiUsage.totalTokens || 0) + state.aiUsage.lastTokens;
        saveState();
        renderAIUsage();
      }
      let content = data?.choices?.[0]?.message?.content;
      if (Array.isArray(content)) content = content.map((part) => part?.text || "").join("");
      if (typeof content !== "string" || !content.trim()) throw new Error("AI 没有返回文字。");
      return content.trim();
    } catch (error) {
      if (error.name === "AbortError") throw new Error("AI 响应超时，请稍后重试。");
      if (String(error.message).includes("Failed to fetch")) {
        throw new Error("浏览器无法连接该接口，可能是服务商未允许跨域请求。");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function parseJSONBlock(text) {
    let source = String(text || "").trim();
    const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) source = fenced[1].trim();
    try {
      return JSON.parse(source);
    } catch (error) {
      const objectStart = source.indexOf("{");
      const objectEnd = source.lastIndexOf("}");
      const arrayStart = source.indexOf("[");
      const arrayEnd = source.lastIndexOf("]");
      if (arrayStart !== -1 && arrayEnd > arrayStart && (objectStart === -1 || arrayStart < objectStart)) {
        return JSON.parse(source.slice(arrayStart, arrayEnd + 1));
      }
      if (objectStart !== -1 && objectEnd > objectStart) {
        return JSON.parse(source.slice(objectStart, objectEnd + 1));
      }
      throw new Error("AI 返回格式无法解析，请重试或换用更稳定的模型。");
    }
  }

  const topicBank = {
    chinese: ["现代文信息筛选", "文言文实词与翻译", "古诗意象与情感", "语言文字运用", "议论文审题"],
    math: ["函数与导数", "三角函数与解三角形", "数列", "立体几何", "解析几何", "概率统计"],
    english: ["听力细节", "阅读理解推断", "七选五衔接", "语法与词汇", "读后续写"],
    physics: ["运动学", "牛顿定律", "功和能", "电磁感应", "物理实验"],
    chemistry: ["物质的量", "化学平衡", "电化学", "有机官能团", "实验与离子检验"],
    biology: ["细胞代谢", "遗传规律", "生命活动调节", "生态系统", "实验设计"]
  };

  function buildLocalPlan(goal) {
    const included = DATA.subjects.filter((subject) => goal.includedSubjects.includes(subject.id));
    const ranked = included
      .map((subject) => {
        const goals = goal.subjectGoals?.[subject.id] || { current: 0, target: 0 };
        const gap = Math.max(0, Number(goals.target) - Number(goals.current));
        return {
          id: subject.id,
          score:
            gap +
            (goal.weakSubjects.includes(subject.id) ? 15 : 0) +
            Math.max(0, 10 - goal.subjectPriority.indexOf(subject.id))
        };
      })
      .sort((a, b) => b.score - a.score);
    const weak = ranked.length ? ranked.map((item) => item.id) : ["math"];
    const days = [];
    const start = startOfDay(new Date());
    const taskMinutes = Math.max(20, Math.round(goal.dailyMinutes / 3));
    for (let index = 0; index < 7; index += 1) {
      const daySubject = weak[index % weak.length];
      const daySubject2 = weak[(index + 1) % weak.length];
      const date = addDays(start, index);
      const tasks = [
        {
          subjectId: daySubject,
          title: `${topicBank[daySubject][index % topicBank[daySubject].length]}专项`,
          detail: "先回顾方法，再完成对应月度题目，并用一句话写下错误原因。",
          minutes: taskMinutes,
          type: "专项练习"
        },
        {
          subjectId: daySubject2,
          title: `${topicBank[daySubject2][(index + 2) % topicBank[daySubject2].length]}训练`,
          detail: "按考试时间限时完成，结束后只复盘最有价值的两个错误。",
          minutes: taskMinutes,
          type: "限时训练"
        },
        {
          subjectId: daySubject,
          title: "到期复习与错题回看",
          detail: "优先处理到期复习，再回看一题同类错题，避免只看答案。",
          minutes: Math.max(15, goal.dailyMinutes - taskMinutes * 2),
          type: "复习"
        }
      ];
      days.push({
        date: dateKey(date),
        label: index === 0 ? "今天" : `第 ${index + 1} 天`,
        theme: `${subjectFor(daySubject).name} × ${subjectFor(daySubject2).name}`,
        tasks
      });
    }
    return {
      title: "七天基础推进计划",
      summary: `以 ${weak.map((id) => subjectFor(id).name).join("、")} 为优先方向，每天安排专项、限时训练和复习，目标是在保持执行的同时逐步补齐薄弱模块。`,
      source: "local",
      strategy: [
        "先完成到期复习，再开始新题",
        "知识学习和限时训练分开记录",
        "每两天检查一次任务完成率"
      ],
      days,
      milestones: [
        { period: "本周", target: "完成计划中的核心专项与限时训练" },
        { period: "本月", target: "薄弱学科基础题正确率稳定提升" }
      ],
      risks: ["如果连续两天完成率低于 70%，应减少任务数量而不是压缩复盘时间。"]
    };
  }

  async function buildAIPlan(goal) {
    const prompt = `请依据以下目标制定未来7天学习计划。必须只返回JSON，不要Markdown。不要承诺分数或录取结果。
目标数据：${JSON.stringify({ ...stateSummary(), ...goal })}
输出格式：
{"title":"计划名称","summary":"核心策略","strategy":["策略1","策略2"],"milestones":[{"period":"本周","target":"可检查的目标"}],"risks":["风险与调整条件"],"days":[{"date":"YYYY-MM-DD","label":"今天","theme":"当天主题","tasks":[{"subjectId":"math","title":"任务名称","detail":"完成标准和复习要求","minutes":45,"type":"专项练习"}]}]}
要求：
1. 必须正好7天，每天2到4项任务，总时长接近每日可学时间。
2. subjectId只能使用 chinese、math、english、physics、chemistry、biology。
3. 优先薄弱学科、到期复习和基础题，不堆砌任务。
4. 按“学科分值差距 × 错因重复次数 × 可提升性”排序，优先安排最容易减少失分的模块。
5. 每天预留约20%机动时间，任务必须具体到能直接执行，并包含可验证的完成标准。
6. 错因重复较多时应安排同类变式和延迟复测，而不是只增加新题数量。`;
    const raw = await callAI(
      "你是严谨的高考学习规划助手。你根据学生真实数据安排可执行任务，不夸大、不承诺成绩。只输出有效JSON。",
      prompt
    );
    return parseJSONBlock(raw);
  }

  function normalizePlan(raw, source, goal) {
    if (!raw || !Array.isArray(raw.days) || raw.days.length === 0) {
      throw new Error("计划缺少按天任务，无法执行。");
    }
    const planId = `plan-${Date.now()}`;
    const days = raw.days.slice(0, 7).map((day, dayIndex) => {
      const tasks = Array.isArray(day.tasks) ? day.tasks : [];
      return {
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(day.date)) ? day.date : dateKey(addDays(new Date(), dayIndex)),
        label: String(day.label || (dayIndex === 0 ? "今天" : `第 ${dayIndex + 1} 天`)),
        theme: String(day.theme || "学习任务"),
        tasks: tasks.slice(0, 5).map((task, taskIndex) => ({
          id: `${planId}-${dayIndex}-${taskIndex}`,
          subjectId: DATA.subjectMap[task.subjectId] ? task.subjectId : "math",
          title: String(task.title || "学习任务"),
          detail: String(task.detail || ""),
          minutes: Math.max(10, Math.min(240, Number(task.minutes) || 30)),
          type: String(task.type || "学习")
        }))
      };
    });
    if (!days.some((day) => day.tasks.length)) throw new Error("计划没有可执行任务。");
    return {
      id: planId,
      title: String(raw.title || "七天学习计划"),
      summary: String(raw.summary || "按照目标推进薄弱模块，并优先完成到期复习。"),
      strategy: Array.isArray(raw.strategy) ? raw.strategy.map(String).slice(0, 5) : [],
      milestones: Array.isArray(raw.milestones) ? raw.milestones.slice(0, 5) : [],
      risks: Array.isArray(raw.risks) ? raw.risks.map(String).slice(0, 5) : [],
      days,
      source,
      generatedAt: new Date().toISOString(),
      goal: { ...goal }
    };
  }

  async function generatePlan(useAI = true) {
    let goal;
    try {
      goal = readGoalForm();
    } catch (error) {
      toast(error.message);
      return;
    }
    if (useAI && !aiConfigured()) {
      saveGoal(goal);
      setPage("ai");
      toast("请先填写并保存 AI 接口，再生成正式计划。", 4000);
      return;
    }
    const button = useAI ? $("#generatePlanButton") : $("#localPlanButton");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = useAI ? "AI 正在生成计划…" : "正在生成…";
    try {
      const raw = useAI ? await buildAIPlan(goal) : buildLocalPlan(goal);
      const plan = normalizePlan(raw, useAI ? "ai" : "local", goal);
      saveGoal(goal);
      state.plan = plan;
      state.planCompletions = {};
      ui.activePlanDay = 0;
      ui.editingGoal = false;
      saveState();
      renderAll();
      toast(useAI ? "AI 学习计划已生成，可以开始执行。" : "本地示例计划已生成，可先体验流程。");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast(`计划生成失败：${error.message}`, 4500);
    } finally {
      button.disabled = false;
      button.textContent = original;
      updateGoalAvailability();
    }
  }

  function planTaskStats() {
    const allTasks = state.plan?.days?.flatMap((day, dayIndex) =>
      day.tasks.map((task) => ({ ...task, dayIndex, date: day.date }))
    ) || [];
    const completed = allTasks.filter((task) => state.planCompletions[task.id]).length;
    return { allTasks, completed, total: allTasks.length };
  }

  function sortTasksForGraph(tasks) {
    const ids = new Set(tasks.map((task) => task.id));
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const incoming = new Map(tasks.map((task) => [task.id, 0]));
    const outgoing = new Map(tasks.map((task) => [task.id, []]));
    state.taskGraph.edges.forEach((edge) => {
      if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) return;
      incoming.set(edge.to, Number(incoming.get(edge.to) || 0) + 1);
      outgoing.get(edge.from).push(edge.to);
    });
    const queue = tasks.filter((task) => incoming.get(task.id) === 0).map((task) => task.id);
    const result = [];
    while (queue.length) {
      const id = queue.shift();
      result.push(byId.get(id));
      outgoing.get(id).forEach((next) => {
        incoming.set(next, incoming.get(next) - 1);
        if (incoming.get(next) === 0) queue.push(next);
      });
    }
    return result.length === tasks.length
      ? result
      : tasks;
  }

  function planCompletionPercent() {
    const stats = planTaskStats();
    return stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  }

  function taskMinutesForCompletion(task, completion) {
    if (completion && typeof completion === "object" && Number(completion.actualMinutes) > 0) {
      return Number(completion.actualMinutes);
    }
    return Number(task.minutes || 0);
  }

  function learningSpeedData() {
    const stats = planTaskStats();
    const completed = stats.allTasks.filter((task) => state.planCompletions[task.id]);
    const estimated = completed.reduce((sum, task) => sum + Number(task.minutes || 0), 0);
    const actualEntries = completed
      .map((task) => state.planCompletions[task.id])
      .filter((value) => value && typeof value === "object" && Number(value.actualMinutes) > 0);
    const actual = actualEntries.reduce((sum, value) => sum + Number(value.actualMinutes), 0);
    const ratio = actual > 0 ? actual / Math.max(1, estimated) : null;
    const speedPercent = actual > 0 ? Math.round((estimated / actual) * 100) : null;
    const remainingMinutes = stats.allTasks
      .filter((task) => !state.planCompletions[task.id])
      .reduce((sum, task) => sum + Number(task.minutes || 0), 0);
    const cutoff = addDays(startOfDay(new Date()), -6).getTime();
    const recentTaskMinutes = stats.allTasks
      .filter((task) => {
        const completion = state.planCompletions[task.id];
        return completion && new Date(typeof completion === "object" ? completion.completedAt : completion).getTime() >= cutoff;
      })
      .reduce((sum, task) => {
        const completion = state.planCompletions[task.id];
        return sum + taskMinutesForCompletion(task, completion);
      }, 0);
    const recentFocusMinutes = weekFocusSeconds() / 60;
    const averageDailyMinutes = Math.max(
      15,
      Math.round((recentTaskMinutes + recentFocusMinutes) / 7)
    );
    const daysNeeded = remainingMinutes > 0 ? Math.ceil(remainingMinutes / averageDailyMinutes) : 0;
    const forecastDate = daysNeeded > 0 ? addDays(new Date(), daysNeeded) : new Date();
    const ratioLabel =
      ratio === null
        ? "暂无时长记录"
        : ratio <= 0.8
          ? "速度快"
          : ratio <= 1.2
            ? "速度正常"
            : "速度偏慢";
    const bySubject = new Map();
    DATA.subjects.forEach((subject) => bySubject.set(subject.id, { estimated: 0, remaining: 0 }));
    stats.allTasks.forEach((task) => {
      const entry = bySubject.get(task.subjectId);
      if (!entry) return;
      entry.estimated += Number(task.minutes || 0);
      if (!state.planCompletions[task.id]) entry.remaining += Number(task.minutes || 0);
    });
    const subjectForecast = DATA.subjects.map((subject) => {
      const values = bySubject.get(subject.id);
      const progress = values.estimated
        ? Math.round(((values.estimated - values.remaining) / values.estimated) * 100)
        : 0;
      const days = values.remaining > 0 ? Math.ceil(values.remaining / averageDailyMinutes) : 0;
      return {
        subject,
        progress,
        remaining: values.remaining,
        days,
        date: days > 0 ? addDays(new Date(), days) : new Date()
      };
    });
    return {
      ratio,
      ratioLabel,
      speedPercent,
      remainingMinutes,
      averageDailyMinutes,
      daysNeeded,
      forecastDate,
      subjectForecast
    };
  }

  function renderSpeedStrip() {
    if (!state.plan) return;
    const speed = learningSpeedData();
    const todayTaskMinutes = planTaskStats().allTasks.reduce((sum, task) => {
      const completion = state.planCompletions[task.id];
      if (
        completion &&
        typeof completion === "object" &&
        completion.actualMinutes &&
        dateKey(completion.completedAt) === dateKey()
      ) {
        return sum + Number(completion.actualMinutes);
      }
      return sum;
    }, 0);
    const todayMinutes = Math.round(
      todayTaskMinutes +
        (todayFocusSeconds() +
          state.studyLog
            .filter((item) => dateKey(item.ts) === dateKey())
            .reduce((sum, item) => sum + Number(item.seconds || 0), 0)) /
          60
    );
    const dailyGoal = Number(state.settings.dailyMinutes || 180);
    const completion = planCompletionPercent();
    const stats = planTaskStats();
    $("#speedTodayMinutes").textContent = `${todayMinutes} 分钟`;
    $("#speedTodayPercent").textContent = `每日目标 ${Math.round((todayMinutes / dailyGoal) * 100)}%`;
    $("#speedRatio").textContent =
      speed.ratio === null ? "--" : `${Math.round(speed.ratio * 100)}%`;
    $("#speedRatioLabel").textContent =
      speed.ratio === null ? "暂无完成时长" : `${speed.ratioLabel} · 学习效率 ${speed.speedPercent}%`;
    $("#speedTaskPercent").textContent = `${completion}%`;
    $("#speedTaskCount").textContent = `${stats.completed} / ${stats.total}`;
    $("#speedGoalEta").textContent =
      speed.remainingMinutes === 0 ? "本轮已完成" : `${speed.daysNeeded} 天`;
    renderGoalTree(speed);
  }

  function renderGoalTree(speed) {
    const included = state.subjectPriority.filter((id) => state.includedSubjects.includes(id));
    const subjectTasks = planTaskStats().allTasks;
    $("#goalTree").innerHTML = `
      <div class="goal-tree-title"><span>目标成就分支</span><small>按优先级排列 · 点击进入任务地图</small></div>
      <div class="goal-tree-nodes">
        ${included
          .map((id, index) => {
            const subject = subjectFor(id);
            const goals = state.subjectGoals[id] || { current: 0, target: 0 };
            const tasks = subjectTasks.filter((item) => item.subjectId === id);
            const done = tasks.filter((item) => state.planCompletions[item.id]).length;
            const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
            const forecast = speed.subjectForecast.find((item) => item.subject.id === id);
            const stateClass = progress >= 100 ? "done" : index === 0 ? "active" : "locked";
            return `
              <button class="goal-achievement ${stateClass}" type="button" data-goal-subject="${id}" style="--subject-color:${subject.color};--subject-tint:${subject.tint}">
                <span class="achievement-icon">${escapeHTML(subject.mark)}</span>
                <span class="achievement-copy">
                  <strong>${escapeHTML(subject.name)} · ${escapeHTML(progress >= 100 ? "已解锁" : index === 0 ? "当前主线" : "进行中")}</strong>
                  <small>${goals.current} → ${goals.target} 分 · 任务 ${done}/${tasks.length}</small>
                </span>
                <span class="achievement-eta">${forecast && forecast.remaining ? `${forecast.days} 天` : "本轮完成"}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPlan() {
    updateGoalAvailability();
    $("#planSetup").hidden = Boolean(state.plan) && !ui.editingGoal;
    $("#planDashboard").hidden = !state.plan || ui.editingGoal;
    if (!state.plan) return;
    $("#currentScoreText").textContent = `${state.plan.goal.currentScore}`;
    $("#targetScoreText").textContent = `${state.plan.goal.targetScore}`;
    $("#goalDeadlineText").textContent = `距离高考 ${Math.max(0, daysBetween(new Date(), state.plan.goal.examDate))} 天`;
    const completion = planCompletionPercent();
    $("#goalProgressText").textContent = `${completion}%`;
    $("#goalProgressFill").style.width = `${completion}%`;
    $("#planTitle").textContent = state.plan.title;
    $("#planSummary").textContent = state.plan.summary;
    $("#planSourceBadge").textContent = state.plan.source === "ai" ? "AI 计划" : "本地计划";
    $("#planUpdatedText").textContent = `${formatShortDate(state.plan.generatedAt)}更新`;

    if (ui.activePlanDay === null) {
      const todayIndex = state.plan.days.findIndex((day) => day.date === dateKey());
      ui.activePlanDay = todayIndex >= 0 ? todayIndex : 0;
    }
    if (ui.activePlanDay >= state.plan.days.length) ui.activePlanDay = 0;
    $("#planDayTabs").innerHTML = state.plan.days
      .map((day, index) => {
        const tasksDone = day.tasks.filter((task) => state.planCompletions[task.id]).length;
        return `
          <button class="day-tab ${index === ui.activePlanDay ? "is-active" : ""}" type="button" data-plan-day="${index}">
            <strong>${escapeHTML(day.label)}</strong>
            <span>${tasksDone}/${day.tasks.length}</span>
          </button>
        `;
      })
      .join("");

    const activeDay = state.plan.days[ui.activePlanDay];
    $("#activeDayTitle").textContent = `${activeDay.label} · ${activeDay.theme}`;
    $("#activeDayMeta").textContent = formatShortDate(activeDay.date);
    const overdueTasks = activeDay.date === dateKey()
      ? state.plan.days
          .filter((day) => day.date < dateKey())
          .flatMap((day) => day.tasks.filter((task) => !state.planCompletions[task.id]).map((task) => ({ ...task, carryover: true })))
      : [];
    const displayTasks = [...overdueTasks, ...sortTasksForGraph(activeDay.tasks)];
    const displayIds = new Set(displayTasks.map((task) => task.id));
    $("#activeDayMinutes").textContent = `${displayTasks.filter((task) => !state.planCompletions[task.id]).reduce((sum, task) => sum + task.minutes, 0)} 分钟`;
    $("#taskList").innerHTML = displayTasks.length
      ? displayTasks
          .map((task) => {
            const completion = state.planCompletions[task.id];
            const done = Boolean(completion);
            const subject = subjectFor(task.subjectId);
            const actual = typeof completion === "object" ? completion.actualMinutes : null;
            const speed = typeof completion === "object" ? completion.speedRating : "";
            return `
              <article class="task-item ${done ? "is-done" : ""} ${task.carryover ? "is-carryover" : ""}" data-task-open="${escapeHTML(task.id)}" style="--subject-color:${subject.color}">
                <button class="task-check ${done ? "" : "empty"}" type="button" data-task-complete="${escapeHTML(task.id)}" aria-label="${done ? "已完成" : "完成任务"}">✓</button>
                <span class="task-copy">
                  <strong>${escapeHTML(task.title)}</strong>
                  <small>${task.carryover ? '<b class="carry-badge">昨日未完成</b>' : ""}${escapeHTML(subject.name)} · ${escapeHTML(task.type)} · ${escapeHTML(task.detail)}${actual ? ` · 实际 ${actual}′ ${escapeHTML(speed || "")}` : ""}</small>
                </span>
                <span class="task-time">${task.minutes}′</span>
              </article>
            `;
          })
          .join("")
      : '<div class="empty-note">这一天没有安排任务，可用于休息或补齐学校作业。</div>';

    const stats = planTaskStats();
    $("#planProgressFill").style.width = `${completion}%`;
    $("#planProgressText").textContent = `${stats.completed} / ${stats.total}`;
    const today = state.plan.days.find((day) => day.date === dateKey());
    const todayDone = today ? today.tasks.filter((task) => state.planCompletions[task.id]).length : 0;
    $("#todayTaskStat").textContent = today ? `${todayDone} / ${today.tasks.length}` : "--";
    const weekAttempts = state.attempts.filter(
      (item) => dateKey(item.ts) >= dateKey(addDays(new Date(), -6))
    ).length;
    $("#weekMasteredStat").textContent = `${weekAttempts} 次`;
    renderSpeedStrip();

    const pastIncomplete = stats.allTasks.filter(
      (task) => task.date < dateKey() && !state.planCompletions[task.id]
    ).length;
    let liveTitle = "计划正在执行";
    let liveText = "按照今日任务推进即可，完成情况会实时记录。";
    if (!stats.completed) {
      liveTitle = "从今天第一项开始";
      liveText = "先完成一项 20—45 分钟的具体任务，再判断计划是否适合自己。";
    } else if (pastIncomplete > 0) {
      liveTitle = `有 ${pastIncomplete} 项旧任务未完成`;
      liveText = "不要让任务无限堆积。建议更新计划，把未完成项压缩到最重要的一到两项。";
    } else if (stats.completed === stats.total) {
      liveTitle = "本轮计划全部完成";
      liveText = "可以更新下一轮计划，并通过题库测试检验掌握程度。";
    } else if (today && todayDone === today.tasks.length) {
      liveTitle = "今天任务已完成";
      liveText = "优先休息和复盘，不必用额外刷题填满时间。";
    }
    $("#liveStatusTitle").textContent = liveTitle;
    $("#liveStatusText").textContent = liveText;
    renderPendingTaskList($("#planDueList"), 5);
    syncNativeTaskSummary();
  }

  function syncNativeTaskSummary() {
    if (!window.ZhijiAndroid?.syncTaskSummary) return;
    const pending = planTaskStats().allTasks
      .filter((task) => !state.planCompletions[task.id])
      .sort((a, b) => `${a.date}${a.title}`.localeCompare(`${b.date}${b.title}`));
    const sample = pending
      .slice(0, 3)
      .map((task) => `${subjectFor(task.subjectId).name}·${task.title}`)
      .join("；");
    window.ZhijiAndroid.syncTaskSummary(pending.length, sample);
  }

  function bindGoalForm() {
    populateGoalForm();
    $("#generatePlanButton").addEventListener("click", () => generatePlan(true));
    $("#localPlanButton").addEventListener("click", () => generatePlan(false));
    $("#editGoalButton").addEventListener("click", () => {
      ui.editingGoal = true;
      renderPlan();
      populateGoalForm();
      $("#planSetup").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#updatePlanButton").addEventListener("click", async () => {
      if (!aiConfigured()) {
        setPage("ai");
        toast("请先配置 AI，才能根据实际执行情况更新计划。");
        return;
      }
      ui.activePlanDay = 0;
      await generatePlan(true);
    });
    $("#subjectPriorityList").addEventListener("change", (event) => {
      const input = event.target.closest("[data-subject-include]");
      if (!input) return;
      const id = input.dataset.subjectInclude;
      if (input.checked) {
        if (!state.includedSubjects.includes(id)) state.includedSubjects.push(id);
      } else {
        state.includedSubjects = state.includedSubjects.filter((subjectId) => subjectId !== id);
      }
      saveState();
      renderSubjectPriority();
    });
    $("#subjectPriorityList").addEventListener("click", (event) => {
      const up = event.target.closest("[data-priority-up]");
      const down = event.target.closest("[data-priority-down]");
      if (!up && !down) return;
      const id = (up || down).dataset[up ? "priorityUp" : "priorityDown"];
      const index = state.subjectPriority.indexOf(id);
      const target = index + (up ? -1 : 1);
      if (index < 0 || target < 0 || target >= state.subjectPriority.length) return;
      [state.subjectPriority[index], state.subjectPriority[target]] = [
        state.subjectPriority[target],
        state.subjectPriority[index]
      ];
      saveState();
      renderSubjectPriority();
    });
  }

  function filteredQuestions() {
    return allQuestions()
      .filter((item) => item.pack === ui.pack)
      .filter((item) => ui.subjectFilter === "all" || item.subjectId === ui.subjectFilter)
      .filter((item) => ui.difficultyFilter === "all" || item.difficulty === ui.difficultyFilter)
      .filter((item) => ui.typeFilter === "all" || item.type === ui.typeFilter)
      .filter((item) => {
        if (!ui.search) return true;
        const haystack = `${item.stem} ${item.module} ${(item.tags || []).join(" ")}`.toLowerCase();
        return haystack.includes(ui.search.toLowerCase());
      })
      .sort((a, b) => {
        const aDue = isQuestionDue(a.id) ? 1 : 0;
        const bDue = isQuestionDue(b.id) ? 1 : 0;
        return bDue - aDue;
      });
  }

  function renderBankFilters() {
    const packSelect = $("#packFilter");
    packSelect.innerHTML = packKeys()
      .map((pack) => `<option value="${pack}" ${pack === ui.pack ? "selected" : ""}>${formatMonth(pack)}</option>`)
      .join("");
    const subjectSelect = $("#subjectFilter");
    subjectSelect.innerHTML =
      '<option value="all">全部学科</option>' +
      DATA.subjects
        .map((subject) => `<option value="${subject.id}" ${ui.subjectFilter === subject.id ? "selected" : ""}>${subject.name}</option>`)
        .join("");
    const types = Array.from(new Set(allQuestions().map((item) => item.type))).sort();
    $("#typeFilter").innerHTML =
      '<option value="all">全部题型</option>' +
      types
        .map((type) => `<option value="${escapeHTML(type)}" ${ui.typeFilter === type ? "selected" : ""}>${escapeHTML(type)}</option>`)
        .join("");
  }

  function renderBank() {
    renderBankFilters();
    $("#currentPackLabel").textContent = formatMonth(ui.pack);
    const packQuestions = allQuestions().filter((item) => item.pack === ui.pack);
    $("#packQuestionCount").textContent = String(packQuestions.length);
    $("#packMasteredCount").textContent = String(
      packQuestions.filter((item) => state.questionProgress[item.id]?.status === "stable").length
    );
    $("#packUpdateText").textContent =
      ui.pack === currentMonthKey() ? "每月更新一次 · 当前月" : `${formatMonth(ui.pack)} 历史题包`;
    $("#selectedCount").textContent = String(state.selectedQuestionIds.length);
    const items = filteredQuestions();
    $("#questionList").innerHTML = items.length
      ? items
          .slice(0, ui.visibleLimit)
          .map((item) => {
            const subject = subjectFor(item.subjectId);
            const selected = state.selectedQuestionIds.includes(item.id);
            const mastery = masteryLabel(item.id);
            return `
              <article class="question-card ${selected ? "is-selected" : ""}" data-question-open="${escapeHTML(item.id)}" style="--subject-color:${subject.color};--subject-tint:${subject.tint}">
                <label class="question-select" data-question-select-label aria-label="选择题目">
                  <input type="checkbox" data-question-select="${escapeHTML(item.id)}" ${selected ? "checked" : ""} />
                  <span>✓</span>
                </label>
                <div class="question-card-main">
                  <div class="question-card-top">
                    <span class="tag subject">${escapeHTML(subject.name)}</span>
                    <span class="tag">${escapeHTML(item.module)}</span>
                    <span class="tag">${escapeHTML(item.difficulty)}</span>
                    <span class="tag">${escapeHTML(item.type)}</span>
                    <span class="tag">${escapeHTML(mastery)}</span>
                    ${item.source ? `<span class="tag">${escapeHTML(item.source)}</span>` : ""}
                  </div>
                  <h3>${escapeHTML(item.stem)}</h3>
                  <p>点击题目查看作答区；答案解析默认隐藏</p>
                </div>
              </article>
            `;
          })
          .join("")
      : '<div class="empty-note">这个月份或筛选条件下没有题目。可使用“AI 生成本月题”或导入题包。</div>';
    $("#loadMoreButton").hidden = items.length <= ui.visibleLimit;
  }

  function toggleQuestionSelection(id, selected) {
    const set = new Set(state.selectedQuestionIds);
    if (selected) set.add(id);
    else set.delete(id);
    state.selectedQuestionIds = Array.from(set);
    saveState();
    renderBank();
  }

  function openQuestion(id) {
    const item = questionById(id);
    if (!item) return;
    const subject = subjectFor(item.subjectId);
    ui.activeQuestionId = id;
    ui.questionOpenedAt = Date.now();
    ui.answerRevealed = false;
    ui.selectedOption = "";
    ui.subjectivePending = false;
    $("#questionMeta").textContent = `${subject.name} · ${item.pack} · ${item.module}`;
    $("#questionTitle").textContent = item.type;
    $("#questionTags").innerHTML = `
      <span class="tag subject" style="--subject-color:${subject.color};--subject-tint:${subject.tint}">${escapeHTML(subject.name)}</span>
      <span class="tag">${escapeHTML(item.difficulty)}</span>
      <span class="tag">${escapeHTML(masteryLabel(id))}</span>
      ${item.source ? `<span class="tag">${escapeHTML(item.source)}</span>` : ""}
      ${(item.tags || []).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
    `;
    $("#questionStem").textContent = item.stem;
    const hasOptions = Array.isArray(item.options) && item.options.length > 0;
    $("#questionOptions").innerHTML = hasOptions
      ? item.options
          .map((option) => {
            const letter = String(option).trim().charAt(0).toUpperCase();
            return `<button class="option-row" type="button" data-option-letter="${escapeHTML(letter)}">${escapeHTML(option)}</button>`;
          })
          .join("")
      : "";
    $("#questionOptions").hidden = !hasOptions;
    $("#subjectiveAnswer").classList.toggle("is-visible", !hasOptions);
    $("#subjectiveAnswer").value = "";
    $("#attemptActions").hidden = false;
    $("#attemptFeedback").hidden = true;
    $("#attemptFeedback").className = "attempt-feedback";
    $("#selfGradePanel").hidden = true;
    $("#errorReasonPanel").hidden = true;
    $("#answerPanel").hidden = true;
    $("#revealAnswerButton").hidden = false;
    $("#answerValue").textContent = item.answer;
    $("#answerExplanation").textContent = item.explanation || "暂无详细解析。";
    $("#reviewHint").textContent = "";
    $("#addCurrentToPrint").textContent = state.selectedQuestionIds.includes(id)
      ? "移出打印"
      : "加入打印";
    openSheet("questionSheet");
  }

  function currentAnswerValue() {
    const question = questionById(ui.activeQuestionId);
    if (!question) return "";
    if (Array.isArray(question.options) && question.options.length) return ui.selectedOption;
    return $("#subjectiveAnswer").value.trim();
  }

  function recordQuestionAttempt(question, correct, options = {}) {
    const now = new Date();
    const progress = state.questionProgress[question.id] || {
      mastered: false,
      status: "new",
      correctCount: 0,
      incorrectCount: 0,
      stable: false,
      reviewCount: 0,
      totalStudySeconds: 0,
      errorCounts: {},
      nextReviewAt: null
    };
    const seconds = Math.max(
      15,
      Math.min(7200, Number(options.seconds ?? Math.round((Date.now() - Number(ui.questionOpenedAt || Date.now())) / 1000)))
    );
    progress.totalStudySeconds = Number(progress.totalStudySeconds || 0) + seconds;
    progress.errorCounts = progress.errorCounts || {};
    progress.lastStudiedAt = now.toISOString();
    progress.lastResult = correct ? "correct" : "incorrect";
    if (correct) {
      progress.correctCount = Number(progress.correctCount || 0) + 1;
      progress.mastered = true;
      progress.lastCorrectAt = now.toISOString();
      if (!progress.firstCorrectAt) {
        progress.firstCorrectAt = now.toISOString();
        progress.status = "review";
        progress.nextReviewAt = reviewMoment(1);
      } else {
        progress.reviewCount = Number(progress.reviewCount || 0) + 1;
        const delayedDays = Math.floor(
          (now.getTime() - new Date(progress.firstCorrectAt).getTime()) / DAY_MS
        );
        if (delayedDays >= 1) {
          progress.delayedCorrectCount = Number(progress.delayedCorrectCount || 0) + 1;
        }
        progress.status =
          delayedDays >= 7 &&
          progress.correctCount >= 3 &&
          progress.delayedCorrectCount >= 2
            ? "stable"
            : delayedDays >= 1
              ? "verified"
              : "review";
        if (progress.status === "stable") progress.stableAt = now.toISOString();
        progress.nextReviewAt = reviewMoment(
          REVIEW_INTERVALS[Math.min(progress.correctCount, REVIEW_INTERVALS.length - 1)]
        );
      }
      progress.lastErrorType = "";
    } else {
      progress.incorrectCount = Number(progress.incorrectCount || 0) + 1;
      progress.status = "learning";
      progress.stable = false;
      progress.nextReviewAt = reviewMoment(1);
      progress.lastErrorType = options.errorType || "待归类";
      progress.errorCounts[progress.lastErrorType] =
        Number(progress.errorCounts[progress.lastErrorType] || 0) + 1;
    }
    state.questionProgress[question.id] = progress;
    state.attempts.push({
      id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      questionId: question.id,
      ts: now.toISOString(),
      correct: Boolean(correct),
      source: options.source || "practice",
      seconds,
      answer: String(options.answer ?? ""),
      errorType: options.errorType || (correct ? "" : "待归类")
    });
    if (seconds > 0) {
      state.studyLog.push({
        id: `attempt-study-${Date.now()}`,
        ts: now.toISOString(),
        seconds,
        subjectId: question.subjectId,
        questionId: question.id
      });
    }
    saveState();
    return progress;
  }

  function showAnswerForCurrent(correct = null, direct = false) {
    ui.answerRevealed = true;
    $("#answerPanel").hidden = false;
    $("#revealAnswerButton").hidden = true;
    $("#attemptActions").hidden = true;
    const question = questionById(ui.activeQuestionId);
    if (!question) return;
    const progress = state.questionProgress[question.id];
    if (correct === true) {
      const feedback = $("#attemptFeedback");
      feedback.hidden = false;
      feedback.className = "attempt-feedback correct";
      feedback.textContent = "作答正确。下一阶段不是重复看答案，而是在到期后独立复测。";
    } else if (correct === false || direct) {
      const feedback = $("#attemptFeedback");
      feedback.hidden = false;
      feedback.className = "attempt-feedback incorrect";
      feedback.textContent = direct
        ? "已记录为需要复习。先对照解析找出具体断点，再选择错因。"
        : "这道题还没有对。先看解析，再选一个最主要的错因。";
      $("#errorReasonPanel").hidden = false;
    }
    $$("#questionOptions .option-row").forEach((option) => {
      const letter = option.dataset.optionLetter;
      const correctLetter = String(question.answer).trim().charAt(0).toUpperCase();
      option.classList.toggle("is-correct", letter === correctLetter);
      option.classList.toggle(
        "is-wrong",
        Boolean(ui.selectedOption) && letter === ui.selectedOption && letter !== correctLetter
      );
    });
    $("#reviewHint").textContent = progress
      ? progress.status === "stable"
        ? "复测状态：稳定掌握。之后仍应在整卷训练中间隔出现。"
        : `复测状态：${masteryLabel(question.id)}。下次复测：${formatShortDate(progress.nextReviewAt)}。`
      : "";
    setTimeout(() => $("#answerPanel").scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  function submitCurrentAnswer() {
    const question = questionById(ui.activeQuestionId);
    if (!question) return;
    const answer = currentAnswerValue();
    if (!answer) {
      toast(Array.isArray(question.options) && question.options.length ? "请先选择一个答案。" : "请先写下答案或关键步骤。");
      return;
    }
    const hasOptions = Array.isArray(question.options) && question.options.length > 0;
    if (!hasOptions) {
      ui.subjectivePending = true;
      showAnswerForCurrent(null, false);
      $("#attemptActions").hidden = true;
      $("#selfGradePanel").hidden = false;
      return;
    }
    const expected = String(question.answer).trim().charAt(0).toUpperCase();
    const correct = answer === expected;
    recordQuestionAttempt(question, correct, {
      source: isQuestionDue(question.id) ? "review" : "practice",
      answer
    });
    showAnswerForCurrent(correct, false);
    renderBank();
    renderOverview();
  }

  function revealQuestionAnswer() {
    const question = questionById(ui.activeQuestionId);
    if (!question) return;
    recordQuestionAttempt(question, false, { source: "assisted" });
    showAnswerForCurrent(false, true);
    renderBank();
    renderOverview();
  }

  function selfGradeQuestion(correct) {
    const question = questionById(ui.activeQuestionId);
    if (!question) return;
    recordQuestionAttempt(question, correct, {
      source: "self-grade",
      answer: currentAnswerValue()
    });
    $("#selfGradePanel").hidden = true;
    showAnswerForCurrent(correct, false);
    renderBank();
    renderOverview();
  }

  function applyErrorType(type) {
    const question = questionById(ui.activeQuestionId);
    if (!question) return;
    const progress = state.questionProgress[question.id];
    if (!progress) return;
    const attempt = [...state.attempts]
      .reverse()
      .find((item) => item.questionId === question.id && !item.correct);
    if (attempt && attempt.errorType !== type) {
      const previous = attempt.errorType;
      if (previous && progress.errorCounts?.[previous]) {
        progress.errorCounts[previous] = Math.max(0, progress.errorCounts[previous] - 1);
      }
      attempt.errorType = type;
      progress.errorCounts = progress.errorCounts || {};
      progress.errorCounts[type] = Number(progress.errorCounts[type] || 0) + 1;
      progress.lastErrorType = type;
      saveState();
    }
    $$("#errorReasonPanel [data-error-type]").forEach((button) =>
      button.classList.toggle("is-selected", button.dataset.errorType === type)
    );
    toast("已记录错因。下一次复习会保留这项信息。");
  }

  function openVariantQuestion() {
    const current = questionById(ui.activeQuestionId);
    if (!current) return;
    const candidates = allQuestions().filter(
      (item) =>
        item.id !== current.id &&
        (item.module === current.module ||
          (item.subjectId === current.subjectId &&
            (item.tags || []).some((tag) => (current.tags || []).includes(tag))))
    );
    const next =
      candidates.find((item) => item.difficulty === current.difficulty) ||
      candidates[0];
    if (!next) {
      toast("暂时没有找到同考点的另一道题，可以先用 AI 生成变式题。");
      return;
    }
    openQuestion(next.id);
  }

  function renderDueList(container, limit = 5) {
    const items = dueQuestions().slice(0, limit);
    if (!items.length) {
      container.innerHTML = '<div class="empty-note">今天没有到期题目。掌握一道题后，会自动安排后续复习。</div>';
      return;
    }
    container.innerHTML = items
      .map((item) => {
        const subject = subjectFor(item.subjectId);
        return `
          <button class="due-item" type="button" data-question-open="${escapeHTML(item.id)}" style="--subject-color:${subject.color}">
            <i></i>
            <span>${escapeHTML(subject.name)} · ${escapeHTML(item.module)} · ${escapeHTML(item.difficulty)}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderPendingTaskList(container, limit = 5) {
    const pending = planTaskStats().allTasks
      .filter((task) => !state.planCompletions[task.id])
      .sort((a, b) => `${a.date}${a.title}`.localeCompare(`${b.date}${b.title}`))
      .slice(0, limit);
    $("#dueCountBadge").textContent = String(
      planTaskStats().allTasks.filter((task) => !state.planCompletions[task.id]).length
    );
    if (!pending.length) {
      container.innerHTML = '<div class="empty-note">本轮任务已全部完成。可以更新下一轮计划。</div>';
      return;
    }
    container.innerHTML = pending
      .map((task) => {
        const subject = subjectFor(task.subjectId);
        return `
          <button class="due-item" type="button" data-task-open="${escapeHTML(task.id)}" style="--subject-color:${subject.color}">
            <i></i><span>${task.date < dateKey() ? "昨日未完成 · " : ""}${escapeHTML(subject.name)} · ${escapeHTML(task.title)}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderQuestionPackStatus() {
    const count = planTaskStats().allTasks.filter((task) => !state.planCompletions[task.id]).length;
    $("#dueCountBadge").textContent = String(count);
  }

  function questionBankMetaForAI() {
    return filteredQuestions().map((item) => ({
      id: item.id,
      subject: subjectFor(item.subjectId).name,
      module: item.module,
      type: item.type,
      difficulty: item.difficulty,
      tags: item.tags,
      mastered: Boolean(state.questionProgress[item.id]?.mastered),
      due: isQuestionDue(item.id)
    }));
  }

  async function aiPickQuestions() {
    if (!aiConfigured()) {
      closeSheets();
      setPage("ai");
      toast("请先配置 AI，再使用智能选题。");
      return;
    }
    const need = $("#aiPickInput").value.trim();
    if (!need) {
      toast("请填写选题要求。");
      return;
    }
    const button = $("#confirmAiPickButton");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "AI 正在选题…";
    try {
      const candidates = questionBankMetaForAI();
      if (!candidates.length) throw new Error("当前筛选结果没有可选题目。");
      const raw = await callAI(
        '你是高考选题助手。只从候选题目中选，不虚构ID。只返回JSON：{"questionIds":["id"],"reason":"简短理由"}。',
        `学生需求：${need}\n目标与进度：${JSON.stringify(stateSummary())}\n候选题目：${JSON.stringify(candidates)}`
      );
      const result = parseJSONBlock(raw);
      const validIds = new Set(candidates.map((item) => item.id));
      const ids = (Array.isArray(result.questionIds) ? result.questionIds : []).filter((id) => validIds.has(id));
      if (!ids.length) throw new Error("AI 没有返回有效题目。");
      state.selectedQuestionIds = ids;
      saveState();
      closeSheets();
      renderBank();
      toast(`AI 已选择 ${ids.length} 道题。${result.reason ? ` ${String(result.reason).slice(0, 70)}` : ""}`, 4500);
    } catch (error) {
      toast(`AI 选题失败：${error.message}`, 4200);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function normalizeQuestion(item, pack) {
    const subjectId = DATA.subjectMap[item.subjectId] ? item.subjectId : null;
    const stem = String(item.stem || "").trim();
    const answer = String(item.answer || "").trim();
    const explanation = String(item.explanation || "").trim();
    const options = Array.isArray(item.options) ? item.options.map(String).filter(Boolean) : [];
    const type = String(item.type || "单项选择");
    if (!subjectId || stem.length < 8 || !answer || explanation.length < 8) return null;
    if (type.includes("选择")) {
      if (options.length < 4) return null;
      const answerLetter = answer.charAt(0).toUpperCase();
      if (!options.some((option) => option.trim().charAt(0).toUpperCase() === answerLetter)) return null;
    }
    return {
      id: String(item.id || `ai-q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      pack: String(item.pack || pack),
      subjectId,
      module: String(item.module || "综合训练"),
      type,
      difficulty: ["基础", "中档", "提升"].includes(item.difficulty) ? item.difficulty : "中档",
      stem,
      options,
      answer,
      explanation,
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      source: item.source || "import"
    };
  }

  async function generateMonthlyQuestions() {
    if (!aiConfigured()) {
      setPage("ai");
      toast("请先配置 AI，再生成月度题包。");
      return;
    }
    const button = $("#generateQuestionsButton");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "正在出题…";
    try {
      const preferred = state.weakSubjects.map((id) => subjectFor(id).name).join("、") || "六科均衡";
      const existingStems = allQuestions()
        .slice(-30)
        .map((item) => item.stem.slice(0, 45))
        .join(" | ");
      const raw = await callAI(
        '你是高考题库编辑。生成原创、准确、无版权复制的中国高中题目。只输出JSON数组，不要Markdown。题目不得超出高中课程标准。',
        `生成 ${ui.pack} 月题包，共12道题。优先学科：${preferred}。难度覆盖基础、中档、提升各约三分之一。答案必须与题干、选项和解析一致；似是而非或无法自洽的题目不要输出。每题格式：
{"id":"唯一英文ID","pack":"${ui.pack}","subjectId":"chinese|math|english|physics|chemistry|biology","module":"高考模块","type":"单项选择|简答|解答","difficulty":"基础|中档|提升","stem":"原创题干","options":["A. ...","B. ...","C. ...","D. ..."]或省略,"answer":"答案","explanation":"详细解析","tags":["考点1"]}
避免重复这些已有题干：${existingStems}`
      );
      const parsed = parseJSONBlock(raw);
      const list = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(list)) throw new Error("AI 没有返回题目数组。");
      const existingIds = new Set(allQuestions().map((item) => item.id));
      const existingStemKeys = new Set(allQuestions().map((item) => item.stem.trim().toLowerCase()));
      const added = list
        .map((item) => normalizeQuestion({ ...item, source: "AI生成" }, ui.pack))
        .filter(Boolean)
        .filter((item) => {
          const stemKey = item.stem.trim().toLowerCase();
          if (existingIds.has(item.id) || existingStemKeys.has(stemKey)) return false;
          existingIds.add(item.id);
          existingStemKeys.add(stemKey);
          return true;
        });
      if (!added.length) throw new Error("没有生成有效新题。");
      state.customQuestions.push(...added);
      saveState();
      renderAll();
      toast(`已向 ${formatMonth(ui.pack)} 题包加入 ${added.length} 道 AI 原创题。`, 4000);
    } catch (error) {
      toast(`生成题包失败：${error.message}`, 4200);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function importQuestions(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const list = Array.isArray(parsed) ? parsed : parsed.questions;
        if (!Array.isArray(list)) throw new Error("JSON 中缺少 questions 数组。");
        const normalized = list
          .map((item) => normalizeQuestion(item, ui.pack))
          .filter(Boolean);
        const existingStems = new Set(allQuestions().map((item) => item.stem.trim().toLowerCase()));
        const unique = normalized.filter((item) => {
          const key = item.stem.trim().toLowerCase();
          if (existingStems.has(key)) return false;
          existingStems.add(key);
          return true;
        });
        if (!unique.length) throw new Error("没有可导入的有效新题。");
        state.customQuestions.push(...unique);
        saveState();
        renderAll();
        toast(`已导入 ${unique.length} 道题。`);
      } catch (error) {
        toast(`导入失败：${error.message}`, 4000);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function buildPrintHTML(includeAnswers) {
    const items = selectedQuestions();
    const title = $("#printPaperTitle").value.trim() || `知迹 ${formatMonth(ui.pack)} 月训练卷`;
    const questionsHTML = items
      .map((item, index) => {
        const subject = subjectFor(item.subjectId);
        const options = Array.isArray(item.options) && item.options.length
          ? `<div class="print-options">${item.options.map((option) => `<div>${escapeHTML(option)}</div>`).join("")}</div>`
          : '<div class="print-answer-lines"></div>';
        return `
          <section class="print-question">
            <h2>${index + 1}. ${escapeHTML(item.stem)}</h2>
            <div class="print-meta">${escapeHTML(subject.name)} · ${escapeHTML(item.module)} · ${escapeHTML(item.difficulty)} · ${escapeHTML(item.type)}</div>
            ${options}
          </section>
        `;
      })
      .join("");
    const answersHTML = includeAnswers
      ? `
        <section class="print-answer-key">
          <h1>参考答案与解析</h1>
          ${items
            .map(
              (item, index) => `
                <article class="print-answer-item">
                  <strong>${index + 1}. ${escapeHTML(item.answer)}</strong>
                  <p>${escapeHTML(item.explanation || "暂无详细解析。")}</p>
                </article>
              `
            )
            .join("")}
        </section>
      `
      : "";
    return `
      <header class="print-header">
        <div>
          <h1>${escapeHTML(title)}</h1>
          <p>题目数量：${items.length} 道 · 生成日期：${dateKey()}</p>
        </div>
        <div>
          <div class="print-meta"><span>姓名：__________</span><span>日期：__________</span><span>得分：__________</span></div>
        </div>
      </header>
      ${questionsHTML}
      ${answersHTML}
    `;
  }

  function openPrintSheet() {
    if (!state.selectedQuestionIds.length) {
      toast("请先勾选要打印的题目。");
      return;
    }
    $("#printPaperTitle").value = `知迹 ${formatMonth(ui.pack)} 月训练卷`;
    $("#printWithAnswers").checked = false;
    openSheet("printSheet");
  }

  function printSelected() {
    $("#printArea").innerHTML = buildPrintHTML($("#printWithAnswers").checked);
    closeSheets();
    setTimeout(() => window.print(), 160);
  }

  function openQuizSetup() {
    if (state.activeQuiz) {
      if (Date.now() < state.activeQuiz.endAt) {
        if (window.confirm("有一场未完成的限时训练，继续上次训练吗？")) {
          openQuizView();
          return;
        }
      }
      state.activeQuiz = null;
    }
    if (!state.selectedQuestionIds.length) {
      toast("请先勾选题目，再开始限时训练。");
      return;
    }
    const selected = selectedQuestions();
    const objective = selected.filter((item) => Array.isArray(item.options) && item.options.length).length;
    $("#quizSetupSummary").textContent = `已选 ${selected.length} 题，其中 ${objective} 道可自动判分；其余主观题交卷后进入自评和订正。`;
    openSheet("quizSetupSheet");
  }

  function startQuiz() {
    const minutes = Number($("#quizDuration").value) || 30;
    const questionIds = state.selectedQuestionIds.slice();
    if (!questionIds.length) return;
    const now = Date.now();
    state.activeQuiz = {
      id: `quiz-${now}`,
      questionIds,
      answers: {},
      index: 0,
      startedAt: now,
      endAt: now + minutes * 60 * 1000,
      durationMinutes: minutes,
      questionStartedAt: now
    };
    ui.quizIndex = 0;
    saveState();
    closeSheets();
    openQuizView();
  }

  function openQuizView() {
    if (!state.activeQuiz) return;
    if (Date.now() >= state.activeQuiz.endAt) {
      submitQuiz(true);
      return;
    }
    ui.quizIndex = Number(state.activeQuiz.index || 0);
    $("#quizResult").hidden = true;
    $("#quizResult").innerHTML = "";
    $(".quiz-question-card").hidden = false;
    $("#submitQuizButton").hidden = false;
    $("#quizView").classList.add("is-open");
    $("#quizView").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    renderQuiz();
  }

  function renderQuiz() {
    const quiz = state.activeQuiz;
    if (!quiz) return;
    const question = questionById(quiz.questionIds[ui.quizIndex]);
    if (!question) return;
    const subject = subjectFor(question.subjectId);
    const saved = quiz.answers[question.id] || "";
    quiz.index = ui.quizIndex;
    quiz.questionStartedAt = quiz.questionStartedAt || Date.now();
    $("#quizTags").innerHTML = `
      <span class="tag subject" style="--subject-color:${subject.color};--subject-tint:${subject.tint}">${escapeHTML(subject.name)}</span>
      <span class="tag">${escapeHTML(question.module)}</span>
      <span class="tag">${escapeHTML(question.difficulty)}</span>
      <span class="tag">${escapeHTML(question.type)}</span>
    `;
    $("#quizStem").textContent = question.stem;
    const hasOptions = Array.isArray(question.options) && question.options.length > 0;
    $("#quizOptions").innerHTML = hasOptions
      ? question.options
          .map((option) => {
            const letter = String(option).trim().charAt(0).toUpperCase();
            return `<button class="option-row ${saved === letter ? "is-selected" : ""}" type="button" data-quiz-option="${escapeHTML(letter)}">${escapeHTML(option)}</button>`;
          })
          .join("")
      : "";
    $("#quizOptions").hidden = !hasOptions;
    $("#quizSubjective").classList.toggle("is-visible", !hasOptions);
    $("#quizSubjective").value = hasOptions ? "" : String(saved || "");
    $("#quizProgressText").textContent = `${ui.quizIndex + 1} / ${quiz.questionIds.length}`;
    $("#quizProgressFill").style.width = `${((ui.quizIndex + 1) / quiz.questionIds.length) * 100}%`;
    $("#quizPreviousButton").disabled = ui.quizIndex === 0;
    $("#quizNextButton").textContent = ui.quizIndex === quiz.questionIds.length - 1 ? "已是最后一题" : "下一题";
    saveState();
    renderQuizClock();
  }

  function renderQuizClock() {
    if (!state.activeQuiz || !$("#quizView").classList.contains("is-open")) return;
    const remaining = Math.max(0, Math.ceil((state.activeQuiz.endAt - Date.now()) / 1000));
    $("#quizTimer").textContent = formatClock(remaining);
    if (remaining <= 0) submitQuiz(true);
  }

  function saveQuizAnswer(value) {
    const quiz = state.activeQuiz;
    if (!quiz) return;
    const question = questionById(quiz.questionIds[ui.quizIndex]);
    if (!question) return;
    const now = Date.now();
    const previous = quiz.answers[question.id];
    quiz.answers[question.id] = value;
    quiz.answerTimes = quiz.answerTimes || {};
    quiz.answerTimes[question.id] =
      Number(quiz.answerTimes[question.id] || 0) +
      Math.max(0, Math.round((now - Number(quiz.questionStartedAt || now)) / 1000));
    quiz.questionStartedAt = now;
    void previous;
    saveState();
  }

  function moveQuiz(direction) {
    const quiz = state.activeQuiz;
    if (!quiz) return;
    const question = questionById(quiz.questionIds[ui.quizIndex]);
    if (question) {
      const hasOptions = Array.isArray(question.options) && question.options.length > 0;
      const value = hasOptions ? quiz.answers[question.id] || "" : $("#quizSubjective").value.trim();
      if (!value) {
        toast("本题还没有作答。可以先作答，也可以稍后返回。");
      }
    }
    const next = Math.max(0, Math.min(quiz.questionIds.length - 1, ui.quizIndex + direction));
    if (next === ui.quizIndex) return;
    ui.quizIndex = next;
    quiz.index = next;
    quiz.questionStartedAt = Date.now();
    saveState();
    renderQuiz();
  }

  function exitQuiz() {
    if (!state.activeQuiz) {
      $("#quizView").classList.remove("is-open");
      return;
    }
    if (!window.confirm("退出后本次作答会保留。确定暂时退出吗？")) return;
    $("#quizView").classList.remove("is-open");
    $("#quizView").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function submitQuiz(auto = false) {
    const quiz = state.activeQuiz;
    if (!quiz) return;
    if (!auto) {
      const unanswered = quiz.questionIds.filter((id) => !quiz.answers[id]).length;
      if (unanswered && !window.confirm(`还有 ${unanswered} 道题未作答，确定交卷吗？`)) return;
    }
    const elapsed = Math.max(
      1,
      Math.min(quiz.durationMinutes * 60, Math.round((Date.now() - quiz.startedAt) / 1000))
    );
    const questions = quiz.questionIds.map(questionById).filter(Boolean);
    const objective = questions.filter((item) => Array.isArray(item.options) && item.options.length);
    let correct = 0;
    const wrongIds = [];
    const pendingIds = [];
    objective.forEach((question) => {
      const answer = String(quiz.answers[question.id] || "");
      if (!answer) return;
      const expected = String(question.answer).trim().charAt(0).toUpperCase();
      const isCorrect = answer === expected;
      if (isCorrect) correct += 1;
      else wrongIds.push(question.id);
      recordQuestionAttempt(question, isCorrect, {
        source: "timed",
        answer,
        seconds: quiz.answerTimes?.[question.id] || Math.round(elapsed / Math.max(1, questions.length))
      });
    });
    questions
      .filter((item) => !Array.isArray(item.options) || !item.options.length)
      .forEach((question) => {
        if (quiz.answers[question.id]) pendingIds.push(question.id);
      });
    const result = {
      correct,
      objectiveTotal: objective.length,
      answeredObjective: objective.filter((item) => quiz.answers[item.id]).length,
      wrongIds,
      pendingIds,
      elapsed,
      accuracy: objective.length ? Math.round((correct / objective.length) * 100) : 0,
      finishedAt: new Date().toISOString()
    };
    state.activeQuiz = null;
    state.lastQuizResult = result;
    saveState();
    $(".quiz-question-card").hidden = true;
    $("#submitQuizButton").hidden = true;
    const resultRoot = $("#quizResult");
    resultRoot.hidden = false;
    const spentLabel = elapsed < 60 ? "不足 1 分钟" : `${Math.round(elapsed / 60)} 分钟`;
    resultRoot.innerHTML = `
      <p class="eyebrow">QUIZ RESULT</p>
      <div class="quiz-result-score"><strong>${result.accuracy}%</strong><span>客观题正确率</span></div>
      <p>用时 ${spentLabel}；客观题答对 ${correct} / ${result.objectiveTotal} 道。</p>
      ${result.wrongIds.length ? `<h3>需要订正的题目</h3><div class="quiz-result-list">${result.wrongIds.map((id) => {
        const item = questionById(id);
        return `<button class="quiz-result-item" type="button" data-review-result="${escapeHTML(id)}"><span>${escapeHTML(subjectFor(item.subjectId).name)} · ${escapeHTML(item.module)}</span><strong>去订正 →</strong></button>`;
      }).join("")}</div>` : ""}
      ${result.pendingIds.length ? `<p class="fine-print">${result.pendingIds.length} 道主观题需要逐题自评和订正。</p>` : ""}
      <div class="attempt-actions">
        <button class="button ghost" id="closeQuizResult" type="button">返回题库</button>
        ${result.wrongIds.length || result.pendingIds.length ? `<button class="button primary" id="reviewQuizResult" type="button">开始订正</button>` : ""}
      </div>
    `;
    $("#quizProgressFill").style.width = "100%";
    $("#quizProgressText").textContent = "已交卷";
    toast(auto ? "时间到，已自动交卷。" : "训练完成，已记录答题结果。", 3600);
    renderBank();
    renderOverview();
  }

  function closeQuizResult() {
    $("#quizView").classList.remove("is-open");
    $("#quizView").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function bindQuestionBank() {
    $("#packFilter").addEventListener("change", (event) => {
      ui.pack = event.target.value;
      ui.visibleLimit = 8;
      renderBank();
    });
    $("#subjectFilter").addEventListener("change", (event) => {
      ui.subjectFilter = event.target.value;
      ui.visibleLimit = 8;
      renderBank();
    });
    $("#difficultyFilter").addEventListener("change", (event) => {
      ui.difficultyFilter = event.target.value;
      ui.visibleLimit = 8;
      renderBank();
    });
    $("#typeFilter").addEventListener("change", (event) => {
      ui.typeFilter = event.target.value;
      ui.visibleLimit = 8;
      renderBank();
    });
    $("#questionSearch").addEventListener("input", (event) => {
      ui.search = event.target.value.trim();
      ui.visibleLimit = 8;
      renderBank();
    });
    $("#selectVisibleButton").addEventListener("click", () => {
      const ids = filteredQuestions().map((item) => item.id);
      state.selectedQuestionIds = Array.from(new Set([...state.selectedQuestionIds, ...ids]));
      saveState();
      renderBank();
    });
    $("#clearSelectionButton").addEventListener("click", () => {
      state.selectedQuestionIds = [];
      saveState();
      renderBank();
    });
    $("#loadMoreButton").addEventListener("click", () => {
      ui.visibleLimit += 8;
      renderBank();
    });
    $("#printButton").addEventListener("click", openPrintSheet);
    $("#confirmPrintButton").addEventListener("click", printSelected);
    $("#aiPickButton").addEventListener("click", () => {
      if (!aiConfigured()) {
        setPage("ai");
        toast("请先配置 AI，再让 AI 选题。");
        return;
      }
      openSheet("aiPickSheet");
    });
    $("#confirmAiPickButton").addEventListener("click", aiPickQuestions);
    $("#generateQuestionsButton").addEventListener("click", generateMonthlyQuestions);
    $("#importQuestionsButton").addEventListener("click", () => $("#questionFileInput").click());
    $("#questionFileInput").addEventListener("change", (event) => importQuestions(event.target.files[0]));
    $("#questionOptions").addEventListener("click", (event) => {
      const option = event.target.closest("[data-option-letter]");
      if (!option || ui.answerRevealed) return;
      ui.selectedOption = option.dataset.optionLetter;
      $$("#questionOptions .option-row").forEach((item) =>
        item.classList.toggle("is-selected", item === option)
      );
    });
    $("#submitAnswerButton").addEventListener("click", submitCurrentAnswer);
    $("#revealAnswerButton").addEventListener("click", revealQuestionAnswer);
    $("#selfGradePanel").addEventListener("click", (event) => {
      const button = event.target.closest("[data-self-grade]");
      if (button) selfGradeQuestion(button.dataset.selfGrade === "correct");
    });
    $("#errorReasonPanel").addEventListener("click", (event) => {
      const button = event.target.closest("[data-error-type]");
      if (button) applyErrorType(button.dataset.errorType);
    });
    $("#variantQuestionButton").addEventListener("click", openVariantQuestion);
    $("#addCurrentToPrint").addEventListener("click", () => {
      const id = ui.activeQuestionId;
      if (!id) return;
      const selected = state.selectedQuestionIds.includes(id);
      toggleQuestionSelection(id, !selected);
      $("#addCurrentToPrint").textContent = selected ? "加入打印" : "移出打印";
    });
    $("#startQuizButton").addEventListener("click", openQuizSetup);
    $("#confirmStartQuiz").addEventListener("click", startQuiz);
    $("#exitQuizButton").addEventListener("click", exitQuiz);
    $("#submitQuizButton").addEventListener("click", submitQuiz);
    $("#quizPreviousButton").addEventListener("click", () => moveQuiz(-1));
    $("#quizNextButton").addEventListener("click", () => moveQuiz(1));
    $("#quizOptions").addEventListener("click", (event) => {
      const option = event.target.closest("[data-quiz-option]");
      if (!option || !state.activeQuiz) return;
      saveQuizAnswer(option.dataset.quizOption);
      $$("#quizOptions .option-row").forEach((item) =>
        item.classList.toggle("is-selected", item === option)
      );
    });
    $("#quizSubjective").addEventListener("input", (event) => {
      if (state.activeQuiz) saveQuizAnswer(event.target.value);
    });
  }

  function addChatMessage(role, text, options = {}) {
    const root = $("#chatMessages");
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}${options.loading ? " loading" : ""}`;
    if (options.id) wrapper.id = options.id;
    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = role === "user" ? "我" : "AI";
    const body = document.createElement("div");
    String(text)
      .split(/\n{2,}/)
      .forEach((paragraph) => {
        const p = document.createElement("p");
        p.textContent = paragraph;
        body.appendChild(p);
      });
    if (options.note) {
      const small = document.createElement("small");
      small.textContent = options.note;
      body.appendChild(small);
    }
    wrapper.append(label, body);
    root.appendChild(wrapper);
    root.scrollTop = root.scrollHeight;
  }

  async function submitChat(event) {
    event.preventDefault();
    const input = $("#chatInput");
    const text = input.value.trim();
    if (!text && !ui.chatAttachments.length) return;
    if (!aiConfigured()) {
      setPage("ai");
      const localGoalChanges = extractGoalChanges(text);
      if (localGoalChanges.length) addGoalChangePreview(localGoalChanges);
      toast("请先填写接口地址、模型名称和 API 密钥。");
      return;
    }
    const attachmentNames = ui.chatAttachments.map((item) => `《${item.name}》`).join("、");
    const attachments = ui.chatAttachments.slice();
    addChatMessage("user", `${text || "请分析这些附件。"}${attachmentNames ? `\n\n附件：${attachmentNames}` : ""}`);
    input.value = "";
    ui.chatAttachments = [];
    renderChatAttachments();
    const loadingId = `chat-loading-${Date.now()}`;
    addChatMessage("AI", "正在思考…", { loading: true, id: loadingId });
    try {
      const response = await callAI(
        `你是中国高中学习助手。回答要具体、简洁、诚实，不承诺考试成绩。当前计划与进度：${JSON.stringify(stateSummary())}`,
        text || "请分析这些附件。",
        attachments
      );
      $(`#${loadingId}`)?.remove();
      addChatMessage("AI", response, { note: "AI 建议仅供学习参考。" });
      addGoalChangePreview(extractGoalChanges(text));
    } catch (error) {
      $(`#${loadingId}`)?.remove();
      addChatMessage("AI", `这次请求没有完成：${error.message}\n\n请检查 AI 配置或网络后重试。`);
      const localGoalChanges = extractGoalChanges(text);
      if (localGoalChanges.length) addGoalChangePreview(localGoalChanges);
    }
  }

  function renderAIConfig() {
    $("#aiProvider").value = state.settings.aiProvider || "deepseek";
    $("#aiEndpoint").value = state.settings.aiEndpoint || "";
    $("#aiModel").value = state.settings.aiModel || "";
    if ($("#aiProvider").value === "deepseek") applyDeepSeekPreset();
    $("#aiKey").value = aiKey();
    $("#tokenPrice").value = String(state.settings.tokenPrice || 2);
    renderAIUsage();
    const ready = aiConfigured();
    $("#aiConnectionBadge").textContent = ready ? "已配置" : "未配置";
    $("#aiConnectionBadge").classList.toggle("ready", ready);
    updateGoalAvailability();
  }

  function saveAIConfig() {
    const provider = $("#aiProvider").value;
    const endpoint = $("#aiEndpoint").value.trim();
    const model = $("#aiModel").value.trim();
    const key = $("#aiKey").value.trim();
    if (endpoint && !/^https?:\/\//i.test(endpoint)) {
      toast("接口地址需要以 http:// 或 https:// 开头。");
      return;
    }
    state.settings.aiEndpoint = endpoint;
    state.settings.aiModel = model;
    state.settings.aiProvider = provider;
    state.settings.tokenPrice = Math.max(0.1, Number($("#tokenPrice").value) || 2);
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
    saveState();
    renderAIConfig();
    toast(endpoint && model && key ? "AI 配置已保存，可以返回计划页生成计划。" : "AI 配置尚未填写完整。");
  }

  function renderAIUsage() {
    const usage = state.aiUsage || {};
    $("#usedTokens").textContent = Number(usage.totalTokens || 0).toLocaleString("zh-CN");
    $("#lastRequestTokens").textContent = Number(usage.lastTokens || 0).toLocaleString("zh-CN");
    const balance = usage.balance === null || usage.balance === undefined ? null : Number(usage.balance);
    const price = Number(state.settings.tokenPrice || 2);
    if (balance !== null && Number.isFinite(balance)) {
      $("#deepseekBalance").textContent = `${usage.currency === "USD" ? "$" : "¥"}${balance.toFixed(2)}`;
      const estimated = price > 0 ? Math.floor((balance / price) * 1000000) : 0;
      $("#estimatedTokens").textContent = `${estimated.toLocaleString("zh-CN")}`;
    } else {
      $("#deepseekBalance").textContent = "未查询";
      $("#estimatedTokens").textContent = "--";
    }
  }

  async function refreshDeepSeekBalance() {
    const key = aiKey() || $("#aiKey").value.trim();
    if (!key) {
      toast("请先填写并保存 DeepSeek API 密钥。");
      return;
    }
    const button = $("#refreshBalanceButton");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "检测中…";
    try {
      if (window.ZhijiAndroid?.fetchDeepSeekBalance) {
        window.ZhijiAndroid.fetchDeepSeekBalance(key);
        return;
      }
      const response = await fetch("https://api.deepseek.com/user/balance", {
        headers: { Authorization: `Bearer ${key}` }
      });
      if (!response.ok) throw new Error(`余额接口返回 ${response.status}`);
      const data = await response.json();
      const info = Array.isArray(data.balance_infos) ? data.balance_infos[0] : null;
      if (!info) throw new Error("余额接口没有返回账户信息");
      state.aiUsage.balance = Number(info.total_balance || 0);
      state.aiUsage.currency = info.currency || "CNY";
      state.aiUsage.checkedAt = new Date().toISOString();
      saveState();
      renderAIUsage();
      $("#balanceHelp").textContent = `余额更新时间：${new Date().toLocaleString("zh-CN")}；Token 数按单价估算。`;
      toast("DeepSeek 账户余额已更新。");
    } catch (error) {
      $("#balanceHelp").textContent =
        "余额检测失败。网页版可能被跨域限制；安卓原生版本可使用系统网络请求。";
      toast(`余额检测失败：${error.message}`, 4200);
    } finally {
      if (!window.ZhijiAndroid?.fetchDeepSeekBalance) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  function applyDeepSeekPreset() {
    if ($("#aiProvider").value === "deepseek") {
      if (!$("#aiEndpoint").value.trim() || !$("#aiEndpoint").value.includes("api.deepseek.com")) {
        $("#aiEndpoint").value = "https://api.deepseek.com/chat/completions";
      }
      if (!$("#aiModel").value.trim() || !$("#aiModel").value.startsWith("deepseek-")) {
        $("#aiModel").value = "deepseek-chat";
      }
    }
  }

  function clearAIConfig() {
    state.settings.aiEndpoint = "";
    state.settings.aiModel = "";
    localStorage.removeItem(API_KEY_STORAGE);
    saveState();
    renderAIConfig();
    toast("已清除 AI 配置。");
  }

  function bindAI() {
    $("#aiProvider").addEventListener("change", applyDeepSeekPreset);
    $("#saveAiButton").addEventListener("click", saveAIConfig);
    $("#clearAiButton").addEventListener("click", clearAIConfig);
    $("#refreshBalanceButton").addEventListener("click", refreshDeepSeekBalance);
    $("#rechargeButton").addEventListener("click", () => {
      const rechargeUrl = "https://platform.deepseek.com/top_up";
      if (window.ZhijiAndroid?.openExternal) {
        window.ZhijiAndroid.openExternal(rechargeUrl);
      } else {
        window.open(rechargeUrl, "_blank", "noopener,noreferrer");
      }
    });
    $("#chatForm").addEventListener("submit", submitChat);
    $("#chatInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitChat(event);
      }
    });
    $("#aiPlanUpdateShortcut").addEventListener("click", () => {
      setPage("plan");
      if (!state.plan) $("#planSetup").scrollIntoView({ behavior: "smooth" });
      else $("#updatePlanButton").click();
    });
    $("#voiceInputButton").addEventListener("click", startVoiceInput);
    $("#attachButton").addEventListener("click", () => $("#chatAttachmentInput").click());
    $("#chatAttachmentInput").addEventListener("change", handleChatAttachments);
    $("#attachmentPreview").addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-attachment]");
      if (!remove) return;
      ui.chatAttachments.splice(Number(remove.dataset.removeAttachment), 1);
      renderChatAttachments();
    });
    $("#enableNotificationsButton").addEventListener("click", enableNotifications);
  }

  function renderChatAttachments() {
    const root = $("#attachmentPreview");
    root.innerHTML = ui.chatAttachments
      .map(
        (item, index) => `
          <span class="attachment-chip">
            <b>${item.type?.startsWith("image/") ? "图" : "文"}</b>
            ${escapeHTML(item.name)}
            <button type="button" data-remove-attachment="${index}" aria-label="移除附件">×</button>
          </span>
        `
      )
      .join("");
  }

  function handleChatAttachments(event) {
    const files = Array.from(event.target.files || []).slice(0, 3);
    files.forEach((file) => {
      if (ui.chatAttachments.length >= 3) return;
      const item = { name: file.name, type: file.type, text: "" };
      const index = ui.chatAttachments.length;
      ui.chatAttachments.push(item);
      const reader = new FileReader();
      reader.onload = () => {
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
          item.dataUrl = String(reader.result || "");
        } else {
          item.text = String(reader.result || "");
        }
        renderChatAttachments();
      };
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file, "utf-8");
      }
      void index;
    });
    event.target.value = "";
    renderChatAttachments();
  }

  function startVoiceInput() {
    if (window.ZhijiAndroid?.startVoiceInput) {
      window.ZhijiAndroid.startVoiceInput();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast("当前浏览器不支持语音识别；安装为安卓原生版本后可接入系统语音。");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.continuous = false;
    const button = $("#voiceInputButton");
    button.classList.add("is-recording");
    button.textContent = "…";
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      $("#chatInput").value = `${$("#chatInput").value}${$("#chatInput").value ? " " : ""}${text}`;
      $("#chatInput").focus();
    };
    recognition.onerror = (event) => {
      toast(`语音识别失败：${event.error || "未知错误"}`);
    };
    recognition.onend = () => {
      button.classList.remove("is-recording");
      button.textContent = "声";
    };
    recognition.start();
  }

  window.onAndroidSpeechResult = function (text) {
    const input = $("#chatInput");
    if (!input || !text) return;
    input.value = `${input.value}${input.value ? " " : ""}${text}`;
    input.focus();
  };

  function extractGoalChanges(text) {
    const changes = [];
    const overall = text.match(/(?:总分|总目标|目标总分)[^0-9]{0,8}(\d{2,3})/);
    if (overall) {
      changes.push({ kind: "overall", oldValue: state.settings.targetScore, newValue: Number(overall[1]) });
    }
    DATA.subjects.forEach((subject) => {
      const expression = new RegExp(`${subject.name}[^0-9]{0,12}(\\d{2,3})\\s*分?`);
      const match = text.match(expression);
      if (match) {
        const oldValue = Number(state.subjectGoals[subject.id]?.target || 0);
        changes.push({ kind: "subject", subjectId: subject.id, subjectName: subject.name, oldValue, newValue: Number(match[1]) });
      }
    });
    return changes.filter(
      (item) => item.newValue >= 0 && item.newValue <= (item.kind === "subject" ? 150 : 750)
    );
  }

  function addGoalChangePreview(changes) {
    if (!changes.length) return;
    ui.pendingGoalChanges = changes;
    const root = $("#chatMessages");
    const wrapper = document.createElement("div");
    wrapper.className = "message assistant";
    wrapper.innerHTML = `
      <span class="message-label">AI</span>
      <div class="goal-change-preview">
        <strong>识别到目标修改</strong>
        ${changes.map((item) => `<div class="goal-change-row"><span>${escapeHTML(item.kind === "overall" ? "总分目标" : `${item.subjectName}目标`)}</span><strong>${item.oldValue} → ${item.newValue}</strong></div>`).join("")}
        <p>确认后会立即更新目标与流程图${state.plan ? "，并尝试重新安排学习计划" : ""}。</p>
        <div class="completion-actions">
          <button class="button ghost small" id="cancelGoalChangeButton" type="button">取消</button>
          <button class="button primary small" id="applyGoalChangeButton" type="button">确认修改</button>
        </div>
      </div>
    `;
    root.appendChild(wrapper);
    root.scrollTop = root.scrollHeight;
  }

  function applyPendingGoalChanges() {
    if (!ui.pendingGoalChanges?.length) return;
    ui.pendingGoalChanges.forEach((change) => {
      if (change.kind === "overall") {
        state.settings.targetScore = change.newValue;
      } else {
        state.subjectGoals[change.subjectId] = {
          ...(state.subjectGoals[change.subjectId] || { current: 0 }),
          target: change.newValue
        };
      }
    });
    ui.pendingGoalChanges = null;
    saveState();
    populateGoalForm();
    renderAll();
    toast("目标已更新。");
    if (state.plan && aiConfigured()) generatePlan(true);
  }

  function bindTaskMap() {
    $("#openTaskMapButton").addEventListener("click", () => openTaskMap());
    $("#closeTaskMapButton").addEventListener("click", closeTaskMap);
    $("#taskConnectModeButton").addEventListener("click", () => {
      ui.taskConnectMode = !ui.taskConnectMode;
      ui.taskConnectFrom = null;
      $("#taskConnectModeButton").classList.toggle("is-active", ui.taskConnectMode);
      $("#taskConnectHint").textContent = ui.taskConnectMode
        ? "连线模式：先点“前一个任务”，再点“下一步任务”。"
        : "拖动卡片改变位置；打开连线模式后依次选择“下一步”。";
      renderTaskMap();
    });
    $("#taskMapAiButton").addEventListener("click", () => {
      $("#taskMapAiPanel").hidden = !$("#taskMapAiPanel").hidden;
    });
    $("#closeTaskMapAi").addEventListener("click", () => {
      $("#taskMapAiPanel").hidden = true;
    });
    $("#runTaskMapAiButton").addEventListener("click", runTaskMapAI);
    $("#completeWithTimeButton").addEventListener("click", () => finishTask(true));
    $("#completeWithoutTimeButton").addEventListener("click", () => finishTask(false));

    $("#taskMapNodes").addEventListener("pointerdown", (event) => {
      const node = event.target.closest("[data-map-task]");
      if (!node || ui.taskConnectMode || event.button !== 0) return;
      const taskId = node.dataset.mapTask;
      const position = state.taskGraph.positions[taskId];
      if (!position) return;
      const scrollRect = $("#taskMapScroll").getBoundingClientRect();
      ui.mapDrag = {
        taskId,
        offsetX: event.clientX - scrollRect.left + $("#taskMapScroll").scrollLeft - position.x,
        offsetY: event.clientY - scrollRect.top + $("#taskMapScroll").scrollTop - position.y,
        moved: false
      };
      node.setPointerCapture?.(event.pointerId);
    });
    document.addEventListener("pointermove", (event) => {
      if (!ui.mapDrag) return;
      const scroll = $("#taskMapScroll");
      const rect = scroll.getBoundingClientRect();
      const layout = taskMapLayout(planTaskStats().allTasks);
      const x = Math.max(
        6,
        Math.min(
          layout.width - layout.nodeWidth - 6,
          event.clientX - rect.left + scroll.scrollLeft - ui.mapDrag.offsetX
        )
      );
      const y = Math.max(10, event.clientY - rect.top + scroll.scrollTop - ui.mapDrag.offsetY);
      const position = state.taskGraph.positions[ui.mapDrag.taskId];
      position.x = x;
      position.y = y;
      ui.mapDrag.moved = true;
      const node = $(`[data-map-task="${ui.mapDrag.taskId}"]`);
      if (node) {
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
      }
    });
    document.addEventListener("pointerup", () => {
      if (!ui.mapDrag) return;
      const moved = ui.mapDrag.moved;
      ui.mapDrag = null;
      saveState();
      if (moved) renderTaskMap();
    });
  }

  function timerRemaining() {
    const timer = state.activeTimer;
    if (!timer) return 0;
    return timer.running
      ? Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000))
      : Math.max(0, Number(timer.remainingSec || 0));
  }

  function formatClock(seconds) {
    const value = Math.max(0, Math.ceil(seconds));
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    return h
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function renderTimerSubjects() {
    $("#timerSubject").innerHTML = DATA.subjects
      .map(
        (subject) =>
          `<option value="${subject.id}" ${state.activeTimer.subjectId === subject.id ? "selected" : ""}>${subject.name}</option>`
      )
      .join("");
    const openTasks = planTaskStats().allTasks.filter(
      (task) => !state.planCompletions[task.id] && (task.date === dateKey() || task.carryover)
    );
    const taskOptions = openTasks.length
      ? openTasks
      : planTaskStats().allTasks.filter((task) => !state.planCompletions[task.id]).slice(0, 10);
    $("#timerTask").innerHTML =
      '<option value="">自由复习 / 自定义</option>' +
      taskOptions
        .map(
          (task) =>
            `<option value="${escapeHTML(task.id)}" ${state.activeTimer.taskId === task.id ? "selected" : ""}>${escapeHTML(subjectFor(task.subjectId).name)} · ${escapeHTML(task.title)}</option>`
        )
        .join("");
  }

  function renderTimer() {
    renderTimerSubjects();
    const remaining = timerRemaining();
    const duration = Math.max(1, state.activeTimer.durationSec);
    const ratio = Math.min(1, Math.max(0, 1 - remaining / duration));
    $("#timerProgress").style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (1 - ratio));
    $("#timerDisplay").textContent = formatClock(remaining);
    $("#timerState").textContent = state.activeTimer.running
      ? remaining <= 5
        ? "即将完成"
        : "正在专注"
      : remaining === duration
        ? "准备专注"
        : remaining > 0
          ? "已暂停"
          : "本轮完成";
    const subject = subjectFor(state.activeTimer.subjectId);
    const activeTask = taskById(state.activeTimer.taskId);
    $("#timerSubjectText").textContent = `${subject.name} · ${activeTask?.title || "专项训练"}`;
    $("#timerToggle").textContent = state.activeTimer.running ? "暂停" : "开始专注";
    $$("#timerModes button").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.minutes) * 60 === duration);
    });
    if (remaining <= 0 && state.activeTimer.running && !ui.timerCompleting) completeTimer();
    if (state.activeTimer.running) syncFocusNotification(remaining);
    renderQuizClock();
  }

  function todayFocusSeconds() {
    return state.focusSessions
      .filter((item) => dateKey(item.ts) === dateKey())
      .reduce((sum, item) => sum + Number(item.seconds || 0), 0);
  }

  function weekFocusSeconds() {
    const start = addDays(startOfDay(new Date()), -6).getTime();
    return state.focusSessions
      .filter((item) => new Date(item.ts).getTime() >= start)
      .reduce((sum, item) => sum + Number(item.seconds || 0), 0);
  }

  function focusStreak() {
    const days = new Set(state.focusSessions.map((item) => dateKey(item.ts)));
    let cursor = startOfDay(new Date());
    if (!days.has(dateKey(cursor))) cursor = addDays(cursor, -1);
    let count = 0;
    while (days.has(dateKey(cursor))) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  function renderFocus() {
    renderTimer();
    const todayMinutes = Math.round(todayFocusSeconds() / 60);
    $("#focusTodayMinutes").textContent = String(todayMinutes);
    $("#focusTodayStat").textContent = String(todayMinutes);
    $("#focusWeekStat").textContent = (weekFocusSeconds() / 3600).toFixed(1);
    $("#focusCountStat").textContent = String(state.focusSessions.length);
    $("#focusStreakStat").textContent = String(focusStreak());
    const recent = state.focusSessions
      .slice()
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 5);
    $("#focusHistory").innerHTML = recent.length
      ? recent
          .map((item) => {
            const subject = subjectFor(item.subjectId);
            return `
              <div class="history-row">
                <i></i>
                <span>${escapeHTML(subject.name)}<small>${formatShortDate(item.ts)}</small></span>
                <strong>${Math.max(1, Math.round(item.seconds / 60))}′</strong>
              </div>
            `;
          })
          .join("")
      : '<div class="empty-note">完成一次专注后，记录会显示在这里。</div>';
  }

  function toggleTimer() {
    const timer = state.activeTimer;
    if (timer.running) {
      timer.remainingSec = timerRemaining();
      timer.running = false;
      timer.endAt = null;
    } else {
      if (timer.remainingSec <= 0) {
        timer.durationSec = state.settings.focusMinutes * 60;
        timer.remainingSec = timer.durationSec;
      }
      timer.running = true;
      timer.endAt = Date.now() + timer.remainingSec * 1000;
      timer.lastNotificationAt = 0;
    }
    saveState();
    renderTimer();
    if (!timer.running) stopFocusNotification();
  }

  function resetTimer() {
    if (state.activeTimer.running && !window.confirm("本轮专注尚未完成，确定重置吗？")) return;
    state.activeTimer = {
      durationSec: state.settings.focusMinutes * 60,
      remainingSec: state.settings.focusMinutes * 60,
      running: false,
      endAt: null,
      subjectId: $("#timerSubject").value || "math",
      taskId: $("#timerTask").value || null
    };
    saveState();
    renderFocus();
  }

  function setTimerMode(minutes) {
    if (state.activeTimer.running && !window.confirm("切换时长会重置本轮专注，继续吗？")) return;
    state.activeTimer.durationSec = Number(minutes) * 60;
    state.activeTimer.remainingSec = Number(minutes) * 60;
    state.activeTimer.running = false;
    state.activeTimer.endAt = null;
    saveState();
    renderTimer();
  }

  function completeTimer() {
    ui.timerCompleting = true;
    const timer = state.activeTimer;
    const seconds = Math.max(60, timer.durationSec);
    state.focusSessions.push({
      id: `focus-${Date.now()}`,
      ts: new Date().toISOString(),
      seconds,
      subjectId: timer.subjectId,
      taskId: timer.taskId || null,
      taskTitle: taskById(timer.taskId)?.title || ""
    });
    timer.running = false;
    timer.endAt = null;
    timer.remainingSec = 0;
    saveState();
    stopFocusNotification();
    renderAll();
    toast(`完成 ${Math.round(seconds / 60)} 分钟专注。`);
    setTimeout(() => {
      ui.timerCompleting = false;
    }, 500);
  }

  function bindFocus() {
    $("#timerToggle").addEventListener("click", toggleTimer);
    $("#timerReset").addEventListener("click", resetTimer);
    $("#timerModes").addEventListener("click", (event) => {
      const button = event.target.closest("[data-minutes]");
      if (button) setTimerMode(button.dataset.minutes);
    });
    $("#timerSubject").addEventListener("change", (event) => {
      state.activeTimer.subjectId = event.target.value;
      saveState();
      renderTimer();
    });
    $("#timerTask").addEventListener("change", (event) => {
      state.activeTimer.taskId = event.target.value || null;
      const task = taskById(state.activeTimer.taskId);
      if (task) state.activeTimer.subjectId = task.subjectId;
      saveState();
      renderTimer();
    });
  }

  let activeSystemNotification = null;

  function syncFocusNotification(remaining) {
    const timer = state.activeTimer;
    const now = Date.now();
    if (now - Number(timer.lastNotificationAt || 0) < 30000) return;
    timer.lastNotificationAt = now;
    const task = taskById(timer.taskId);
    const subject = subjectFor(timer.subjectId);
    const title = `正在专注 · ${subject.name}`;
    const body = `${task?.title || "专项训练"} · 剩余 ${formatClock(remaining)}`;
    if (window.ZhijiAndroid?.updateFocusNotification) {
      window.ZhijiAndroid.updateFocusNotification(title, body, state.activeTimer.running);
      return;
    }
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      try {
        activeSystemNotification?.close();
        activeSystemNotification = new Notification(title, {
          body,
          tag: "zhiji-focus",
          silent: true,
          requireInteraction: true
        });
      } catch (error) {
        console.warn("Focus notification unavailable", error);
      }
    }
  }

  function stopFocusNotification() {
    activeSystemNotification?.close();
    activeSystemNotification = null;
    if (window.ZhijiAndroid?.updateFocusNotification) {
      window.ZhijiAndroid.updateFocusNotification("知迹专注", "", false);
    }
  }

  async function enableNotifications() {
    if (window.ZhijiAndroid?.requestNotificationPermission) {
      window.ZhijiAndroid.requestNotificationPermission();
      $("#enableNotificationsButton").textContent = "通知已开启";
      toast("安卓通知权限已请求。");
      return;
    }
    if (!("Notification" in window)) {
      toast("当前浏览器不支持系统通知。安装安卓原生版本后可支持锁屏提醒。");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      $("#enableNotificationsButton").textContent = "通知已开启";
      new Notification("知迹提醒已开启", { body: "每天 20:00 和 23:00 检查未完成任务。" });
      toast("通知已开启。");
    } else {
      toast("通知权限未开启，仍可在应用内看到提醒。");
    }
  }

  function checkScheduledReminders() {
    if (!state.plan) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const reminderTimes = [state.settings.reminderEvening || "20:00", state.settings.reminderNight || "23:00"];
    if (!reminderTimes.includes(hhmm)) return;
    const key = `${dateKey(now)}-${hhmm}`;
    state.dailyMeta.sentReminders = (state.dailyMeta.sentReminders || []).filter(
      (item) => item.startsWith(dateKey(now))
    );
    if (state.dailyMeta.sentReminders.includes(key)) return;
    const tasks = planTaskStats().allTasks.filter(
      (task) => task.date === dateKey() && !state.planCompletions[task.id]
    );
    if (!tasks.length) return;
    state.dailyMeta.sentReminders.push(key);
    saveState();
    const message = `还有 ${tasks.length} 项任务未完成：${tasks.slice(0, 3).map((task) => task.title).join("、")}${tasks.length > 3 ? "…" : ""}`;
    if (window.ZhijiAndroid?.showNotification) {
      window.ZhijiAndroid.showNotification("知迹任务提醒", message);
    } else if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("知迹任务提醒", { body: message, tag: `zhiji-reminder-${key}` });
      } catch (error) {
        console.warn("Reminder notification unavailable", error);
      }
    }
    showInAppReminder(message);
  }

  function showInAppReminder(message) {
    if ($("#reminderBanner")) $("#reminderBanner").remove();
    const banner = document.createElement("div");
    banner.id = "reminderBanner";
    banner.className = "reminder-banner";
    banner.innerHTML = `<strong>任务提醒</strong><span>${escapeHTML(message)}</span><button type="button" data-reminder-open>查看任务</button><button type="button" data-reminder-close aria-label="关闭">×</button>`;
    document.body.appendChild(banner);
  }

  function refreshDailyState(initial = false) {
    const today = dateKey();
    const previous = state.dailyMeta.lastRefreshDate;
    if (previous === today) return;
    state.dailyMeta.lastRefreshDate = today;
    if (state.plan) {
      const todayIndex = state.plan.days.findIndex((day) => day.date === today);
      ui.activePlanDay = todayIndex >= 0 ? todayIndex : 0;
      const overdue = planTaskStats().allTasks.filter(
        (task) => task.date < today && !state.planCompletions[task.id]
      ).length;
      if (!initial && previous) {
        toast(
          overdue
            ? `已刷新今日任务，昨日有 ${overdue} 项未完成，已置顶显示。`
            : "已刷新今天的任务。",
          4200
        );
      }
      if (todayIndex < 0 && aiConfigured()) {
        toast("当前七天计划已到期，正在让 AI 刷新下一轮任务。", 3600);
        setTimeout(() => generatePlan(true), 250);
      }
    }
    saveState();
    renderPlan();
  }

  function renderOverview() {
    const summary = stateSummary();
    const completion = planCompletionPercent();
    const stats = planTaskStats();
    const speed = learningSpeedData();
    let statusTitle = "先制定并开始执行计划";
    let statusText = "计划应具体到每天的任务，避免只设置目标而没有行动。";
    if (state.plan && stats.completed === 0) {
      statusTitle = "先完成今天的第一项任务";
      statusText = "有了实际记录后，才能根据执行速度判断计划是否跟得上。";
    } else if (state.plan) {
      const pastIncomplete = stats.allTasks.filter(
        (task) => task.date < dateKey() && !state.planCompletions[task.id]
      ).length;
      if (pastIncomplete > 0) {
        statusTitle = "当前有旧任务积压";
        statusText = `过去日期还有 ${pastIncomplete} 项未完成。建议更新计划并减少每日任务量，而不是继续堆任务。`;
      } else if (stats.completed === stats.total) {
        statusTitle = "本轮计划完成，可以进入测试与更新";
        statusText = "用月度题库检查薄弱点，再让 AI 根据成绩和执行情况生成下一轮计划。";
      } else {
        statusTitle = "计划执行节奏正常";
        statusText = "当前没有明显积压。继续按日完成，并优先保证到期复习。";
      }
    }
    $("#overviewStatusTitle").textContent = statusTitle;
    $("#overviewStatusText").textContent = statusText;
    $("#overviewCompletion").textContent = `${completion}%`;
    $("#overviewGoal").textContent = state.plan
      ? `${state.settings.currentScore}→${state.settings.targetScore}`
      : "未设置";
    $("#overviewDays").textContent = `距高考 ${Math.max(0, daysBetween(new Date(), state.settings.examDate))} 天`;
    $("#overviewMastered").textContent =
      speed.speedPercent === null ? "--" : `${speed.speedPercent}%`;
    $("#overviewMasteryRate").textContent = speed.ratio === null ? "暂无时长" : speed.ratioLabel;
    $("#overviewFocus").textContent = `${(state.focusSessions.reduce((sum, item) => sum + item.seconds, 0) / 3600).toFixed(1)}h`;
    $("#overviewFocusWeek").textContent = `本周 ${(weekFocusSeconds() / 3600).toFixed(1)}h`;
    const overdueCount = stats.allTasks.filter(
      (task) => task.date < dateKey() && !state.planCompletions[task.id]
    ).length;
    const pendingCount = stats.total - stats.completed;
    $("#overviewDue").textContent = `${pendingCount}`;
    $("#overviewDueHint").textContent = overdueCount ? `其中 ${overdueCount} 项昨日结转` : "暂无昨日结转";
    $("#overviewMasteryTotal").textContent = `${stats.completed} / ${stats.total}`;
    $("#qualityAccuracy").textContent = `${completion}%`;
    $("#qualityRetention").textContent =
      speed.ratio === null ? "暂无记录" : `${Math.round(speed.ratio * 100)}%`;
    $("#qualityPace").textContent = `${speed.averageDailyMinutes} 分钟`;
    $("#qualityError").textContent = `${overdueCount} 项`;
    renderForecast();

    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = addDays(startOfDay(new Date()), -offset);
      const tasksDone = stats.allTasks.filter(
        (task) => task.date === dateKey(date) && state.planCompletions[task.id]
      ).length;
      const focusMinutes = Math.round(
        state.focusSessions
          .filter((item) => dateKey(item.ts) === dateKey(date))
          .reduce((sum, item) => sum + item.seconds, 0) / 60
      );
      const attemptCount = 0;
      days.push({
        date,
        tasksDone,
        focusMinutes,
        attemptCount,
        value: tasksDone * 2 + attemptCount * 1.5 + focusMinutes / 15
      });
    }
    const max = Math.max(1, ...days.map((item) => item.value));
    $("#weekChart").innerHTML = days
      .map(
        (item) => `
          <div class="chart-day">
            <em>${item.tasksDone}项/${item.attemptCount}题</em>
            <i class="chart-bar" style="height:${item.value ? Math.max(7, (item.value / max) * 88) : 3}%"></i>
            <small>${new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(item.date)}</small>
          </div>
        `
      )
      .join("");
    $("#overviewWeekText").textContent = `${days.filter((item) => item.tasksDone || item.focusMinutes || item.attemptCount).length} 天有记录`;

    $("#subjectBars").innerHTML = DATA.subjects
      .map((subject) => {
        const subjectTasks = stats.allTasks.filter((item) => item.subjectId === subject.id);
        const done = subjectTasks.filter((item) => state.planCompletions[item.id]).length;
        const percent = subjectTasks.length ? Math.round((done / subjectTasks.length) * 100) : 0;
        return `
          <div class="subject-bar" style="--subject-color:${subject.color}">
            <span>${subject.name}</span>
            <div class="track"><i style="width:${percent}%"></i></div>
            <strong>${done}/${subjectTasks.length}</strong>
          </div>
        `;
      })
      .join("");
  }

  function taskById(taskId) {
    return planTaskStats().allTasks.find((task) => task.id === taskId) || null;
  }

  function openCompletionSheet(taskId) {
    const task = taskById(taskId);
    if (!task) return;
    ui.activeTaskId = taskId;
    const existing = state.planCompletions[taskId];
    $("#completeTaskTitle").textContent = task.title;
    $("#completeTaskEstimate").textContent = `预计 ${task.minutes} 分钟`;
    $("#actualMinutesInput").value =
      existing && typeof existing === "object" && existing.actualMinutes
        ? String(existing.actualMinutes)
        : "";
    const existingBox = $("#completionExistingEvaluation");
    if (existing && typeof existing === "object" && existing.actualMinutes) {
      existingBox.hidden = false;
      existingBox.innerHTML = `
        <strong>已完成 · ${escapeHTML(existing.speedRating)} · 实际 ${existing.actualMinutes} 分钟</strong>
        <p>${escapeHTML(existing.aiEvaluation || existing.speedMessage || "")}</p>
      `;
    } else {
      existingBox.hidden = true;
      existingBox.innerHTML = "";
    }
    openSheet("completeTaskSheet");
  }

  function speedRatingFor(actualMinutes, estimatedMinutes) {
    const ratio = Number(actualMinutes) / Math.max(1, Number(estimatedMinutes));
    if (ratio <= 0.8) return { label: "快", ratio, message: "实际用时不超过预计的 80%，完成速度偏快。" };
    if (ratio <= 1.2) return { label: "正常", ratio, message: "实际用时处于预计用时的 80%—120%，速度正常。" };
    return { label: "偏慢", ratio, message: "实际用时超过预计的 120%，完成速度偏慢。" };
  }

  async function evaluateTaskSpeed(task, completion) {
    if (!completion.actualMinutes) return;
    if (!aiConfigured()) {
      completion.aiEvaluation = completion.speedMessage;
      saveState();
      renderPlan();
      return;
    }
    try {
      const result = await callAI(
        "你是客观的学习速度评估助手。只能根据实际用时、预计用时和既定阈值解释快慢，不得使用主观印象或改变评级。评级已经固定：≤80%为快，80%-120%为正常，>120%为偏慢。用不超过60字解释可能原因，并给一个改进动作。",
        JSON.stringify({
          task: task.title,
          subject: subjectFor(task.subjectId).name,
          estimatedMinutes: task.minutes,
          actualMinutes: completion.actualMinutes,
          ratio: Number(completion.ratio.toFixed(2)),
          fixedRating: completion.speedRating
        })
      );
      completion.aiEvaluation = result.trim().slice(0, 180);
    } catch (error) {
      completion.aiEvaluation = `${completion.speedMessage} AI 解释失败：${error.message}`;
    }
    saveState();
    renderPlan();
    renderOverview();
  }

  async function finishTask(withTime) {
    const task = taskById(ui.activeTaskId);
    if (!task) return;
    const actualMinutes = Number($("#actualMinutesInput").value);
    if (withTime && (!actualMinutes || actualMinutes < 1 || actualMinutes > 600)) {
      toast("请输入 1—600 分钟之间的实际用时，或者选择“不填时长”。");
      return;
    }
    const completion = {
      completedAt: new Date().toISOString(),
      actualMinutes: withTime ? actualMinutes : null,
      speedRating: "未记录",
      speedMessage: "没有记录实际时长，无法客观判断速度快慢。",
      aiEvaluation: ""
    };
    if (withTime) {
      const result = speedRatingFor(actualMinutes, task.minutes);
      completion.speedRating = result.label;
      completion.ratio = result.ratio;
      completion.speedMessage = result.message;
    }
    state.planCompletions[task.id] = completion;
    saveState();
    closeSheets();
    renderAll();
    if ($("#taskMapView").classList.contains("is-open")) {
      document.body.style.overflow = "hidden";
      renderTaskMap();
    }
    toast(
      withTime
        ? `任务完成，客观评级：${completion.speedRating}。AI 正在补充解释。`
        : "任务已完成，未记录时长，因此不进行速度快慢评价。",
      3600
    );
    if (withTime) evaluateTaskSpeed(task, completion);
  }

  function taskMapLayout(tasks) {
    const width = Math.max(288, $("#taskMapScroll").clientWidth);
    const nodeWidth = Math.max(126, Math.min(168, (width - 30) / 2));
    const rows = Math.ceil(tasks.length / 2);
    return {
      width,
      nodeWidth,
      height: Math.max(760, rows * 122 + 48)
    };
  }

  function ensureTaskPositions(tasks, layout) {
    tasks.forEach((task, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      if (!state.taskGraph.positions[task.id]) {
        state.taskGraph.positions[task.id] = {
          x: 10 + column * (layout.nodeWidth + 13) + ((index * 7) % 13) - 6,
          y: 26 + row * 122 + ((index * 19) % 27) - 13
        };
      }
      const position = state.taskGraph.positions[task.id];
      position.x = Math.max(6, Math.min(layout.width - layout.nodeWidth - 6, Number(position.x)));
      position.y = Math.max(6, Number(position.y));
    });
  }

  function renderTaskMap(selectedId = ui.activeTaskId) {
    const tasks = planTaskStats().allTasks;
    const layout = taskMapLayout(tasks);
    ensureTaskPositions(tasks, layout);
    const canvas = $("#taskMapCanvas");
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
    canvas.style.setProperty("--map-node-width", `${layout.nodeWidth}px`);
    $("#taskMapEdges").setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    $("#taskMapEdges").setAttribute("width", layout.width);
    $("#taskMapEdges").setAttribute("height", layout.height);
    const nodeWidth = layout.nodeWidth;
    const nodeHeight = 92;
    $("#taskMapEdges").innerHTML =
      '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#65e2c2"/></marker></defs>' +
      state.taskGraph.edges
        .map((edge) => {
          const from = state.taskGraph.positions[edge.from];
          const to = state.taskGraph.positions[edge.to];
          if (!from || !to) return "";
          const x1 = from.x + nodeWidth;
          const y1 = from.y + nodeHeight / 2;
          const x2 = to.x;
          const y2 = to.y + nodeHeight / 2;
          const mid = (x1 + x2) / 2;
          return `<path d="M${x1} ${y1} C${mid} ${y1},${mid} ${y2},${x2} ${y2}" fill="none" stroke="#65e2c2" stroke-width="2.5" stroke-opacity=".65" marker-end="url(#arrow)" />`;
        })
        .join("");
    $("#taskMapNodes").innerHTML = tasks
      .map((task) => {
        const subject = subjectFor(task.subjectId);
        const position = state.taskGraph.positions[task.id];
        const completion = state.planCompletions[task.id];
        const isDone = Boolean(completion);
        const rating = typeof completion === "object" ? completion.speedRating : "";
        return `
          <button
            class="task-map-node ${isDone ? "is-done" : ""} ${selectedId === task.id ? "is-selected" : ""} ${ui.taskConnectFrom === task.id ? "is-connect-source" : ""}"
            type="button"
            data-map-task="${escapeHTML(task.id)}"
            style="left:${position.x}px;top:${position.y}px;--subject-color:${subject.color};--subject-tint:${subject.tint};--tilt:${((tasks.indexOf(task) % 5) - 2) * 0.7}deg"
          >
            <span class="map-node-head"><i>${escapeHTML(subject.mark)}</i><small>${escapeHTML(task.type)}</small></span>
            <strong>${escapeHTML(task.title)}</strong>
            <span class="map-node-foot"><small>${task.minutes}′ · ${escapeHTML(subject.name)}</small>${rating ? `<em>${escapeHTML(rating)}</em>` : ""}</span>
          </button>
        `;
      })
      .join("");
    if (selectedId) {
      const task = taskById(selectedId);
      if (task) {
        const completion = state.planCompletions[selectedId];
        const subject = subjectFor(task.subjectId);
        $("#taskInspector").innerHTML = `
          <div class="inspector-main">
            <span class="tag subject" style="--subject-color:${subject.color};--subject-tint:${subject.tint}">${escapeHTML(subject.name)}</span>
            <h3>${escapeHTML(task.title)}</h3>
            <p>${escapeHTML(task.detail)}</p>
            <small>预计 ${task.minutes} 分钟${completion && typeof completion === "object" && completion.actualMinutes ? ` · 实际 ${completion.actualMinutes} 分钟 · ${completion.speedRating}` : ""}</small>
            ${completion && typeof completion === "object" && completion.aiEvaluation ? `<small>${escapeHTML(completion.aiEvaluation)}</small>` : ""}
          </div>
          <button class="button primary small" data-task-complete="${escapeHTML(selectedId)}" type="button">${completion ? "查看完成记录" : "完成任务"}</button>
        `;
      }
    } else {
      $("#taskInspector").innerHTML = '<span>选择一个任务卡查看详情</span>';
    }
    saveState();
  }

  function openTaskMap(taskId = null, subjectId = null) {
    if (!state.plan) {
      toast("先生成学习计划。");
      return;
    }
    const tasks = planTaskStats().allTasks;
    const preferred =
      taskId ||
      (subjectId && tasks.find((task) => task.subjectId === subjectId)?.id) ||
      ui.activeTaskId ||
      tasks[0]?.id ||
      null;
    ui.activeTaskId = preferred;
    $("#taskMapView").classList.add("is-open");
    $("#taskMapView").setAttribute("aria-hidden", "false");
    $("#taskConnectModeButton").classList.remove("is-active");
    document.body.style.overflow = "hidden";
    renderTaskMap(preferred);
  }

  function closeTaskMap() {
    $("#taskMapView").classList.remove("is-open");
    $("#taskMapView").setAttribute("aria-hidden", "true");
    $("#taskMapAiPanel").hidden = true;
    ui.taskConnectMode = false;
    ui.taskConnectFrom = null;
    $("#taskConnectModeButton").classList.remove("is-active");
    document.body.style.overflow = "";
  }

  function handleTaskMapNode(taskId) {
    ui.activeTaskId = taskId;
    if (ui.taskConnectMode) {
      if (!ui.taskConnectFrom) {
        ui.taskConnectFrom = taskId;
        $("#taskConnectHint").textContent = `已选择起点「${taskById(taskId)?.title || taskId}」，再点一个任务设为下一步。`;
      } else if (ui.taskConnectFrom !== taskId) {
        const exists = state.taskGraph.edges.some(
          (edge) => edge.from === ui.taskConnectFrom && edge.to === taskId
        );
        if (!exists) state.taskGraph.edges.push({ from: ui.taskConnectFrom, to: taskId });
        ui.taskConnectFrom = null;
        saveState();
        toast("任务连线已建立，当天任务顺序已自动整理。");
        $("#taskConnectHint").textContent = "连线成功。继续点两个任务可添加下一条连线。";
      }
    }
    renderTaskMap(taskId);
  }

  async function runTaskMapAI() {
    if (!aiConfigured()) {
      toast("请先配置 DeepSeek 或兼容 AI。");
      return;
    }
    const instruction = $("#taskMapAiInput").value.trim();
    if (!instruction) {
      toast("请填写希望 AI 如何调整任务。");
      return;
    }
    const button = $("#runTaskMapAiButton");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "AI 正在调整…";
    try {
      const tasks = planTaskStats().allTasks.map((task) => ({
        id: task.id,
        date: task.date,
        subjectId: task.subjectId,
        title: task.title,
        detail: task.detail,
        minutes: task.minutes,
        type: task.type
      }));
      const raw = await callAI(
        "你是任务图编辑助手。只能修改给出的任务ID，不能虚构ID。只返回JSON，不要Markdown。格式：{\"reply\":\"简短说明\",\"updates\":[{\"taskId\":\"id\",\"title\":\"可选\",\"detail\":\"可选\",\"minutes\":30}],\"addEdges\":[{\"from\":\"任务ID\",\"to\":\"任务ID\"}],\"removeEdges\":[{\"from\":\"任务ID\",\"to\":\"任务ID\"}]}。连线表示 from 完成后再做 to。",
        `学生要求：${instruction}\n当前任务：${JSON.stringify(tasks)}\n当前连线：${JSON.stringify(state.taskGraph.edges)}`
      );
      const parsed = parseJSONBlock(raw);
      ui.pendingTaskPatch = parsed;
      const updateLabels = (parsed.updates || []).map((item) => {
        const task = taskById(item.taskId);
        return task ? `<div>${escapeHTML(task.title)} → ${escapeHTML(item.title || task.title)} · ${item.minutes || task.minutes} 分钟</div>` : "";
      });
      const edgeLabels = (parsed.addEdges || []).map(
        (edge) => `<div>${escapeHTML(taskById(edge.from)?.title || edge.from)} → ${escapeHTML(taskById(edge.to)?.title || edge.to)}</div>`
      );
      $("#taskMapAiResult").hidden = false;
      $("#taskMapAiResult").innerHTML = `
        <p>${escapeHTML(parsed.reply || "AI 已完成调整方案。")}</p>
        ${updateLabels.length ? `<h4>任务修改</h4>${updateLabels.join("")}` : ""}
        ${edgeLabels.length ? `<h4>新增连线</h4>${edgeLabels.join("")}` : ""}
        <button class="button primary small" id="applyTaskMapPatchButton" type="button">应用修改</button>
      `;
    } catch (error) {
      toast(`AI 调整失败：${error.message}`, 4000);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function applyTaskMapPatch() {
    const patch = ui.pendingTaskPatch;
    if (!patch) return;
    (patch.updates || []).forEach((update) => {
      const task = taskById(update.taskId);
      if (!task) return;
      if (update.title) task.title = String(update.title);
      if (update.detail) task.detail = String(update.detail);
      if (Number(update.minutes) > 0) task.minutes = Math.max(10, Math.min(240, Number(update.minutes)));
    });
    (patch.removeEdges || []).forEach((edge) => {
      state.taskGraph.edges = state.taskGraph.edges.filter(
        (item) => !(item.from === edge.from && item.to === edge.to)
      );
    });
    (patch.addEdges || []).forEach((edge) => {
      if (!taskById(edge.from) || !taskById(edge.to) || edge.from === edge.to) return;
      if (!state.taskGraph.edges.some((item) => item.from === edge.from && item.to === edge.to)) {
        state.taskGraph.edges.push({ from: edge.from, to: edge.to });
      }
    });
    ui.pendingTaskPatch = null;
    $("#taskMapAiResult").hidden = true;
    $("#taskMapAiPanel").hidden = true;
    saveState();
    renderTaskMap();
    renderPlan();
    toast("AI 修改已应用，任务顺序与预计时长已更新。");
  }

  function renderForecast() {
    const speed = learningSpeedData();
    $("#forecastOverallDate").textContent =
      speed.remainingMinutes === 0
        ? "本轮任务已完成"
        : new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(speed.forecastDate);
    $("#forecastOverallDetail").textContent =
      `剩余约 ${Math.round(speed.remainingMinutes / 60 * 10) / 10} 小时 · 近 7 天日均 ${speed.averageDailyMinutes} 分钟`;
    $("#forecastOverallPercent").textContent = `${planCompletionPercent()}%`;
    $("#forecastRing").style.setProperty("--forecast-angle", `${planCompletionPercent()}%`);
    $("#subjectForecast").innerHTML = speed.subjectForecast
      .filter((item) => state.includedSubjects.includes(item.subject.id))
      .map(
        (item) => `
          <div class="subject-forecast-row" style="--subject-color:${item.subject.color}">
            <span>${escapeHTML(item.subject.name)}</span>
            <div class="track"><i style="width:${item.progress}%"></i></div>
            <strong>${item.remaining ? `${item.days} 天` : "完成"}</strong>
          </div>
        `
      )
      .join("");
  }

  function openSheet(id) {
    const sheet = $(`#${id}`);
    if (!sheet) return;
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeSheets() {
    $$(".sheet.is-open").forEach((sheet) => {
      sheet.classList.remove("is-open");
      sheet.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow =
      $("#taskMapView").classList.contains("is-open") ? "hidden" : "";
  }

  function download(filename, content, type = "application/json") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportBackup() {
    download(
      `知迹学习备份-${dateKey()}.json`,
      JSON.stringify({ app: "知迹", version: DATA.version, exportedAt: new Date().toISOString(), state }, null, 2)
    );
    toast("备份已导出，不包含 API 密钥。");
  }

  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const imported = mergeState(parsed.state || parsed);
        Object.assign(state, imported);
        saveState();
        closeSheets();
        renderAll();
        populateGoalForm();
        toast("学习备份已导入。");
      } catch (error) {
        toast(`备份导入失败：${error.message}`);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function exportCalendar() {
    const due = dueQuestions();
    if (!due.length) {
      toast("目前没有到期复习。");
      return;
    }
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Zhiji//Question Review//CN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];
    due.slice(0, 80).forEach((question) => {
      const progress = state.questionProgress[question.id];
      const dueDate = new Date(progress.nextReviewAt);
      dueDate.setHours(20, 0, 0, 0);
      const subject = subjectFor(question.subjectId);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${dateKey(dueDate).replaceAll("-", "")}-${question.id}@zhiji.local`,
        `DTSTAMP:${dateTimeKey(new Date())}`,
        `DTSTART:${dateTimeKey(dueDate)}`,
        `DTEND:${dateTimeKey(new Date(dueDate.getTime() + 15 * 60000))}`,
        `SUMMARY:复习 ${subject.name}｜${question.module}`,
        `DESCRIPTION:打开知迹题库完成本次复习。${question.stem.slice(0, 80)}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT10M",
        "ACTION:DISPLAY",
        "DESCRIPTION:10分钟后到期复习",
        "END:VALARM",
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    download("知迹复习日历.ics", lines.join("\r\n"), "text/calendar;charset=utf-8");
    toast("复习日历已生成，可导入安卓系统日历。");
  }

  function bindData() {
    $("#dataButton").addEventListener("click", () => openSheet("dataSheet"));
    $("#exportBackupButton").addEventListener("click", exportBackup);
    $("#importBackupInput").addEventListener("change", (event) => importBackup(event.target.files[0]));
    $("#exportCalendarButton").addEventListener("click", exportCalendar);
    $("#resetProgressButton").addEventListener("click", () => {
      if (!window.confirm("这会清空计划、题目掌握、专注和选词记录，但保留 AI 配置。确定继续吗？")) return;
      state.plan = null;
      state.planCompletions = {};
      state.questionProgress = {};
      state.selectedQuestionIds = [];
      state.focusSessions = [];
      state.vocabProgress = {};
      saveState();
      closeSheets();
      renderAll();
      toast("学习记录已清空。");
    });
  }

  function dictionary() {
    const seen = new Set();
    return [...(LEGACY.vocabSeed || []), ...state.customWords].filter((item) => {
      const key = String(item.word || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function wordDue(item) {
    const progress = state.vocabProgress[item.id];
    return Boolean(
      progress?.nextReviewAt &&
        startOfDay(progress.nextReviewAt) <= startOfDay(new Date())
    );
  }

  function currentWord() {
    const words = dictionary();
    if (!words.length) return null;
    if (!ui.wordQueue || ui.wordQueue.length !== words.length) {
      const base = words.slice();
      for (let index = base.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [base[index], base[swapIndex]] = [base[swapIndex], base[index]];
      }
      const due = base.filter((item) => wordDue(item));
      const rest = base.filter((item) => !wordDue(item));
      ui.wordQueue = [];
      while (due.length || rest.length) {
        if (due.length && (ui.wordQueue.length % 2 === 0 || !rest.length)) {
          ui.wordQueue.push(due.shift());
        } else if (rest.length) {
          ui.wordQueue.push(rest.shift());
        }
      }
    }
    if (ui.wordIndex !== null && ui.wordQueue[ui.wordIndex]) return ui.wordQueue[ui.wordIndex];
    return ui.wordQueue[0] || words[0];
  }

  function renderWordbook() {
    const words = dictionary();
    const mastered = words.filter((item) => state.vocabProgress[item.id]?.mastered).length;
    $("#wordbankCount").textContent = `${words.length} 个`;
    $("#wordMasteredText").textContent = `已掌握 ${mastered} 个`;
    $("#wordProgressFill").style.width = `${Math.min(100, (mastered / 3500) * 100)}%`;
    $("#wordMiniProgress").textContent = `${mastered} / 3500`;
    const word = currentWord();
    if (!word) {
      $("#wordText").textContent = "暂无词条";
      return;
    }
    const progress = state.vocabProgress[word.id];
    $("#wordText").textContent = word.word;
    $("#wordMeaning").textContent = word.meaning;
    $("#wordMeaning").hidden = !ui.wordRevealed;
    $("#revealMeaning").hidden = ui.wordRevealed;
    $("#wordSentence").textContent = word.sentence || "暂无例句。";
    $("#wordStatus").textContent = wordDue(word)
      ? "到期复习"
      : progress?.mastered
        ? `下一次 ${formatShortDate(progress.nextReviewAt)}`
        : "待学习";
  }

  function openWordbook() {
    ui.wordQueue = null;
    ui.wordIndex = null;
    ui.wordRevealed = false;
    $("#wordbookView").classList.add("is-open");
    $("#wordbookView").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    renderWordbook();
  }

  function closeWordbook() {
    $("#wordbookView").classList.remove("is-open");
    $("#wordbookView").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function recordWord(result) {
    const word = currentWord();
    if (!word) return;
    const progress = state.vocabProgress[word.id] || {
      mastered: false,
      reviewCount: 0,
      nextReviewAt: null
    };
    if (result === "again") {
      progress.mastered = false;
      progress.reviewCount = 0;
      progress.nextReviewAt = reviewMoment(1);
    } else if (result === "hard") {
      progress.mastered = false;
      progress.reviewCount = Math.max(0, progress.reviewCount - 1);
      progress.nextReviewAt = reviewMoment(1);
    } else {
      progress.mastered = true;
      progress.reviewCount += 1;
      progress.nextReviewAt = reviewMoment(
        REVIEW_INTERVALS[Math.min(progress.reviewCount, REVIEW_INTERVALS.length - 1)]
      );
    }
    progress.lastReviewedAt = new Date().toISOString();
    state.vocabProgress[word.id] = progress;
    const words = dictionary();
    if (!ui.wordQueue) ui.wordQueue = words.slice();
    const index = ui.wordQueue.findIndex((item) => item.id === word.id);
    ui.wordIndex = (Math.max(0, index) + 1) % ui.wordQueue.length;
    ui.wordRevealed = false;
    saveState();
    renderWordbook();
    toast(result === "known" ? `已记录「${word.word}」。` : "已标记为需要再次记忆。");
  }

  function importWords(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const seen = new Set(dictionary().map((item) => item.word.toLowerCase()));
      const added = [];
      String(reader.result || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          const [word, meaning, sentence] = line.split(",").map((item) => item.trim());
          if (!word || !meaning || seen.has(word.toLowerCase())) return;
          seen.add(word.toLowerCase());
          added.push({
            id: `custom-word-${Date.now()}-${added.length}`,
            word,
            meaning,
            sentence: sentence || ""
          });
        });
      state.customWords.push(...added);
      saveState();
      renderWordbook();
      toast(added.length ? `已导入 ${added.length} 个单词。` : "没有发现新单词。");
    };
    reader.readAsText(file, "utf-8");
  }

  async function generateWords() {
    if (!aiConfigured()) {
      toast("请先配置 AI。");
      return;
    }
    const button = $("#aiWordsButton");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "正在生成…";
    try {
      const existing = dictionary().slice(-100).map((item) => item.word).join(", ");
      const raw = await callAI(
        "生成适合中国高考的核心英语词汇。只输出JSON数组，格式为[{\"word\":\"abandon\",\"meaning\":\"放弃；抛弃\",\"sentence\":\"例句\"}]。",
        `生成60个高考高频词，避开：${existing}`
      );
      const parsed = parseJSONBlock(raw);
      if (!Array.isArray(parsed)) throw new Error("AI 没有返回单词数组。");
      const seen = new Set(dictionary().map((item) => item.word.toLowerCase()));
      const added = [];
      parsed.forEach((item) => {
        const word = String(item.word || "").trim();
        const meaning = String(item.meaning || "").trim();
        if (!word || !meaning || seen.has(word.toLowerCase())) return;
        seen.add(word.toLowerCase());
        added.push({
          id: `ai-word-${Date.now()}-${added.length}`,
          word,
          meaning,
          sentence: String(item.sentence || "")
        });
      });
      state.customWords.push(...added);
      saveState();
      renderWordbook();
      toast(`新增 ${added.length} 个单词。`);
    } catch (error) {
      toast(`AI 补词失败：${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function bindWordbook() {
    $("#openWordbook").addEventListener("click", openWordbook);
    $("#closeWordbook").addEventListener("click", closeWordbook);
    $("#revealMeaning").addEventListener("click", () => {
      ui.wordRevealed = true;
      renderWordbook();
    });
    $$("[data-word-result]").forEach((button) =>
      button.addEventListener("click", () => recordWord(button.dataset.wordResult))
    );
    $("#importWordsButton").addEventListener("click", () => $("#wordFileInput").click());
    $("#wordFileInput").addEventListener("change", (event) => importWords(event.target.files[0]));
    $("#aiWordsButton").addEventListener("click", generateWords);
  }

  function renderAll() {
    renderPlan();
    renderFocus();
    renderAIConfig();
    renderOverview();
    renderQuestionPackStatus();
    renderWordbook();
  }

  function handleGlobalClick(event) {
    if (event.target.closest("[data-reminder-open]")) {
      $("#reminderBanner")?.remove();
      setPage("plan");
      return;
    }
    if (event.target.closest("[data-reminder-close]")) {
      $("#reminderBanner")?.remove();
      return;
    }
    if (event.target.closest("[data-open-wordbook]")) {
      openWordbook();
      return;
    }
    const jump = event.target.closest("[data-page-jump]");
    if (jump) {
      setPage(jump.dataset.pageJump);
      return;
    }
    const close = event.target.closest("[data-close-sheet]");
    if (close) {
      closeSheets();
      return;
    }
    const dayButton = event.target.closest("[data-plan-day]");
    if (dayButton) {
      ui.activePlanDay = Number(dayButton.dataset.planDay);
      renderPlan();
      return;
    }
    const goalSubject = event.target.closest("[data-goal-subject]");
    if (goalSubject) {
      openTaskMap(null, goalSubject.dataset.goalSubject);
      return;
    }
    const taskComplete = event.target.closest("[data-task-complete]");
    if (taskComplete) {
      openCompletionSheet(taskComplete.dataset.taskComplete);
      return;
    }
    const taskOpen = event.target.closest("[data-task-open]");
    if (taskOpen) {
      openTaskMap(taskOpen.dataset.taskOpen);
      return;
    }
    const mapNode = event.target.closest("[data-map-task]");
    if (mapNode) {
      handleTaskMapNode(mapNode.dataset.mapTask);
      return;
    }
    if (event.target.closest("#applyTaskMapPatchButton")) {
      applyTaskMapPatch();
      return;
    }
    if (event.target.closest("#applyGoalChangeButton")) {
      applyPendingGoalChanges();
      return;
    }
    if (event.target.closest("#cancelGoalChangeButton")) {
      ui.pendingGoalChanges = null;
      event.target.closest(".goal-change-preview")?.remove();
      return;
    }
    const reviewResult = event.target.closest("[data-review-result]");
    if (reviewResult) {
      closeQuizResult();
      openQuestion(reviewResult.dataset.reviewResult);
      return;
    }
    if (event.target.closest("#closeQuizResult")) {
      closeQuizResult();
      return;
    }
    if (event.target.closest("#reviewQuizResult")) {
      const first = state.lastQuizResult?.wrongIds?.[0] || state.lastQuizResult?.pendingIds?.[0];
      if (first) {
        closeQuizResult();
        openQuestion(first);
      }
      return;
    }
    if (event.target.closest("[data-question-select-label]")) return;
    const questionOpen = event.target.closest("[data-question-open]");
    if (questionOpen) {
      openQuestion(questionOpen.dataset.questionOpen);
    }
  }

  function bindGlobal() {
    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("change", (event) => {
      const questionSelect = event.target.closest("[data-question-select]");
      if (questionSelect) {
        toggleQuestionSelection(questionSelect.dataset.questionSelect, questionSelect.checked);
        return;
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if ($("#wordbookView").classList.contains("is-open")) closeWordbook();
        else closeSheets();
      }
    });
    window.addEventListener("resize", () => {
      if ($("#taskMapView").classList.contains("is-open")) renderTaskMap();
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js").catch((error) => console.warn("SW failed", error));
    }
  }

  function init() {
    bindGlobal();
    bindGoalForm();
    bindQuestionBank();
    bindAI();
    bindTaskMap();
    bindFocus();
    bindData();
    bindWordbook();
    renderAll();
    refreshDailyState(true);
    const requested = new URLSearchParams(location.search).get("page");
    if (["plan", "focus", "ai", "overview"].includes(requested)) setPage(requested);
    setInterval(renderTimer, 500);
    setInterval(() => {
      refreshDailyState();
      checkScheduledReminders();
    }, 30000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshDailyState();
        renderAll();
      }
    });
    registerServiceWorker();
    console.info("知迹 v4：任务地图、速度监控与 DeepSeek 原生接口已启用。");
  }

  init();
})();

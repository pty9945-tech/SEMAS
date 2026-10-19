import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { SITE_CENTER, SITE_NAME, SITE_SUBTITLE } from "../policy/branding.js";
import "./styles.css";

function Icon({ name = "leaf", size = 20, ...props }) {
  const paths = {
    leaf: (
      <>
        <path d="M19 4c-8-1-14 3-13 9 1 5 8 6 11 1 2-3 2-6 2-10Z" />
        <path d="m5 20 9-10M8 16l-1-5m4 2 5 1" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    back: (
      <>
        <path d="M19 12H5m6-6-6 6 6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-9v.1" />
      </>
    ),
    store: (
      <>
        <path d="m4 4-2 6c0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0l-2-6H4ZM4 14v6h16v-6M9 20v-6h6v6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18m-13 5h3" />
      </>
    ),
    pause: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 8v8m6-8v8" />
      </>
    ),
    close: (
      <>
        <path d="m7 7 10 10M7 17 17 7" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.1" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M15 8V3H3v12h5" />
      </>
    ),
    print: (
      <>
        <path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7Z" />
        <path d="M17 11h.1" />
      </>
    ),
    reset: (
      <>
        <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />
      </>
    ),
    person: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H4v16h5m4-14 6 6-6 6m-6-6h12" />
      </>
    ),
    edit: (
      <>
        <path d="m4 16-1 5 5-1L20 8l-4-4L4 16Zm9-9 4 4" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    external: (
      <>
        <path d="M14 3h7v7m0-7L10 14M11 4H4v16h16v-7" />
      </>
    ),
    folder: (
      <>
        <path d="M3 7V4h7l3 3h8v13H3Z" />
        <path d="M8 12h8m-8 4h5" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.folder}
    </svg>
  );
}
const STATUS = {
  reviewing: { label: "검토 중", icon: "folder", className: "reviewing" },
  needs_info: {
    label: "추가 확인 필요",
    icon: "help",
    className: "needs-info",
  },
  ineligible: {
    label: "입력 기준상 요건 미충족",
    icon: "close",
    className: "ineligible",
  },
};
const REASON_LABELS = {
  met: "충족",
  failed: "미충족",
  unknown: "확인 필요",
  unanswered: "미확인",
};
const DEFAULT_NOTICE = "2026년 제공 자료 기준 · 접수 현황 별도 확인";
const PUBLIC_SITE = __PUBLIC_SITE__;
async function request(path, options = {}) {
  if (PUBLIC_SITE) {
    const { publicRequest } = await import('./public-api.js');
    return publicRequest(path, options);
  }
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data =
    response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data?.error ||
        data?.message ||
        "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
const post = (body) => ({ method: "POST", body: JSON.stringify(body) });
function Badge({ status }) {
  const s = STATUS[status] || STATUS.needs_info;
  return (
    <span className={`status ${s.className}`}>
      <Icon name={s.icon} size={13} />
      {s.label}
    </span>
  );
}
function Brand({ compact = false }) {
  return (
    <div className="brand" aria-label={SITE_NAME}>
      <span className="brand-mark">
        <Icon name="leaf" size={28} />
      </span>
      <div>
        <strong>{SITE_CENTER}</strong>
        {!compact && (
          <span className="brand-subtitle">{SITE_SUBTITLE}</span>
        )}
      </div>
    </div>
  );
}
function PolicyNotice({ meta }) {
  return (
    <div className="policy-notice">
      <Icon name="info" size={16} />
      <span>
        <strong>{meta?.notice || DEFAULT_NOTICE}</strong>
        <span className="policy-detail">
          최종 지원 여부는 공식 심사와 접수 상황에 따라 결정돼요.
        </span>
      </span>
      <span className="policy-pill">{meta?.year || 2026}</span>
    </div>
  );
}
function AssumptionNotice({ meta }) {
  if (!meta?.assumptionNotice) return null;
  return (
    <aside className="assumption-notice" aria-label="상담 전제" data-testid="assumption-notice">
      <Icon name="info" size={18} />
      <div>
        <strong>상담 전제 · 소상공인 기본요건 충족</strong>
        <p>{meta.assumptionNotice} {meta.assumptionDetails}</p>
        {meta.assumedRequirements?.length > 0 && (
          <details className="assumption-details">
            <summary>가정한 기본요건 보기</summary>
            <ul>{meta.assumedRequirements.map((item) => <li key={item}>{item}</li>)}</ul>
          </details>
        )}
      </div>
    </aside>
  );
}
function Login({ onLogin, notice }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        const data = await request(
          "/api/auth/request",
          post({ email: email.trim() }),
        );
        setSent(true);
        setMessage(
          data.message ||
            "초대된 이메일이면 인증번호가 발송됩니다. 받은 메일을 확인해 주세요.",
        );
      } else {
        const data = await request(
          "/api/auth/verify",
          post({ email: email.trim(), code: code.trim() }),
        );
        await onLogin(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <header className="login-header">
        <Brand />
        <span className="private-label">
          <Icon name="shield" size={16} />
          초대받은 상담직원 전용
        </span>
      </header>
      <main className="login-main">
        <section className="login-intro">
          <span className="eyebrow">
            <span className="tiny-dot" />
            소상공인의 다음 걸음을 함께
          </span>
          <h1>
            복잡한 정책자금,
            <br />
            <span>한 질문씩 차근차근.</span>
          </h1>
          <p>
            상황에 맞는 질문을 따라가며
            <br />
            검토할 자금과 확인할 조건을 함께 살펴보세요.
          </p>
          <div className="login-illustration" aria-hidden="true">
            <div className="floating-note">
              <span className="note-check">
                <Icon name="check" size={16} />
              </span>
              오늘의 상담도, 차분하게
            </div>
            <div className="paper-card">
              <span className="paper-icon">
                <Icon name="store" size={36} />
              </span>
              <div className="paper-line long" />
              <div className="paper-line" />
              <div className="paper-mini">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="plant-icon">
              <Icon name="leaf" size={58} />
            </div>
            <span className="illustration-spark">
              <Icon name="spark" size={26} />
            </span>
          </div>
          <div className="privacy-note">
            <Icon name="shield" size={18} />
            <span>
              개인식별정보 없이 상담하고,
              <br />
              상담 내용은 기본적으로 저장하지 않아요.
            </span>
          </div>
        </section>
        <section className="login-card">
          <span className="login-lock">
            <Icon name="mail" size={26} />
          </span>
          <p className="eyebrow">우리 상담 공간에 오신 걸 환영해요</p>
          <h2>{sent ? "이메일을 확인해 주세요" : "이메일로 시작하기"}</h2>
          <p className="login-description">
            초대받은 이메일로 인증하면
            <br />
            비밀번호 없이 안전하게 이용할 수 있어요.
          </p>
          {notice && (
            <div className="inline-message" role="status">
              {notice}
            </div>
          )}
          <form onSubmit={submit}>
            <label htmlFor="login-email">이메일 주소</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              required
              value={email}
              disabled={sent || busy}
              onChange={(e) => setEmail(e.target.value)}
            />
            {sent && (
              <>
                <label htmlFor="login-code">인증번호</label>
                <input
                  id="login-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="메일로 받은 8자리 숫자"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </>
            )}
            {message && (
              <p className="form-message" role="status">
                {message}
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button full" disabled={busy}>
              {busy ? "확인하고 있어요…" : sent ? "로그인" : "인증번호 받기"}
              <Icon name="arrow" size={18} />
            </button>
            {sent && (
              <button
                className="text-button full"
                type="button"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setMessage("");
                  setError("");
                }}
              >
                이메일 변경 또는 인증번호 다시 받기
              </button>
            )}
          </form>
          <div className="invitation-note">
            <Icon name="info" size={16} />
            <span>
              초대받지 않은 이메일은 접근할 수 없어요.
              <br />
              이용이 필요하다면 관리자에게 초대를 요청해 주세요.
            </span>
          </div>
        </section>
      </main>
      <div className="login-policy">
        <PolicyNotice />
      </div>
      <footer className="login-footer">
        <span>{SITE_NAME}</span>
        <span>공식 기관이 제공하는 서비스가 아닙니다.</span>
      </footer>
    </div>
  );
}
function Evidence({ evidence }) {
  if (!evidence) return null;
  return (
    <span className="evidence">
      <Icon name="folder" size={12} />
      {evidence.document}
      {evidence.item ? ` · ${evidence.item}` : ""}
      {evidence.url && (
        <a href={evidence.url} target="_blank" rel="noreferrer">
          근거 보기
        </a>
      )}
    </span>
  );
}
function ReasonList({ reasons = [], compact = false }) {
  return (
    <ul className={`reason-list ${compact ? "compact" : ""}`}>
      {reasons.map((reason) => (
        <li key={reason.conditionId}>
          <span className={`reason-icon ${reason.status}`}>
            <Icon
              name={
                reason.status === "met"
                  ? "check"
                  : reason.status === "failed"
                    ? "close"
                    : "help"
              }
              size={14}
            />
          </span>
          <div>
            <div className="reason-top">
              <span>{reason.label}</span>
              <span className="reason-status">
                {REASON_LABELS[reason.status]}
              </span>
            </div>
            {reason.answerLabel && <p>선택한 답변: {reason.answerLabel}</p>}
            <Evidence evidence={reason.evidence} />
          </div>
        </li>
      ))}
    </ul>
  );
}
function Summary({ evaluation, busy, onEdit }) {
  return (
    <section className="side-card summary-card">
      <div className="side-heading">
        <h2>
          <Icon name="folder" size={18} />
          지금까지의 선택
        </h2>
        <span className="count-chip">{evaluation.answered.length}</span>
      </div>
      {evaluation.answered.length === 0 ? (
        <div className="empty-summary">
          <span className="empty-summary-icon">
            <Icon name="edit" size={24} />
          </span>
          <p>선택한 내용이 여기에 모여요.</p>
          <span>언제든 다시 눌러 수정할 수 있어요.</span>
        </div>
      ) : (
        <ol className="answer-list">
          {evaluation.answered.map((answer, index) => (
            <li key={answer.questionId}>
              <span className="answer-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p>{answer.title}</p>
                <strong>{answer.answerLabel}</strong>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={`${answer.title} 답변 수정`}
                data-testid={`edit-${answer.questionId}`}
                disabled={busy}
                onClick={() => onEdit(answer.questionId)}
              >
                <Icon name="edit" size={15} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="summary-footnote">
        <Icon name="info" size={13} />
        답변을 바꾸면 이후 질문을 다시 확인해요.
      </p>
    </section>
  );
}
function CandidateSidebar({ candidates }) {
  const active = candidates.filter((c) => c.status !== "ineligible").length;
  return (
    <section className="side-card candidate-card">
      <div className="side-heading">
        <h2>
          <Icon name="leaf" size={18} />
          검토 중인 후보
        </h2>
        <span className="count-chip mint">{active}</span>
      </div>
      <p className="side-description">
        답변에 따라 후보와 확인사항이 달라져요.
      </p>
      <div className="candidate-list">
        {candidates.map((fund) => (
          <details
            className={`candidate-item ${fund.status === "ineligible" ? "muted" : ""}`}
            key={fund.id}
          >
            <summary>
              <span className="candidate-title">{fund.name}</span>
              <span className="candidate-bottom">
                <Badge status={fund.status} />
                <Icon name="chevron" size={15} />
              </span>
            </summary>
            <div className="candidate-details">
              <ReasonList
                compact
                reasons={fund.reasons.filter((r) => r.status !== "unanswered")}
              />
              {fund.reasons.every((r) => r.status === "unanswered") && (
                <p>질문에 답하면 조건을 하나씩 확인해요.</p>
              )}
            </div>
          </details>
        ))}
      </div>
      <div className="candidate-note">
        <Icon name="info" size={15} />
        <p>
          후보 표시는 승인 가능성을 의미하지 않아요. 접수 상태는 별도로 확인해야
          해요.
        </p>
      </div>
    </section>
  );
}
function OptionFundRelation({ option, id }) {
  const funds = option.relatedFunds || [];
  const visibleFunds = funds.length > 3 ? funds.slice(0, 2) : funds;
  const remainingFunds = funds.length > 3 ? funds.slice(2) : [];
  return (
    <div className="option-funds" id={id} data-testid={`option-related-${option.value}`}>
      <strong className="option-funds-label">
        <Icon name="folder" size={13} />
        {option.relationLabel || "연관 자금"}
      </strong>
      {visibleFunds.length > 0 && (
        <ul className="option-fund-list">
          {visibleFunds.map((fund) => <li key={fund.id} data-fund-id={fund.id}>{fund.name}</li>)}
        </ul>
      )}
      {remainingFunds.length > 0 && (
        <details className="option-funds-more" data-testid={`option-related-more-${option.value}`}>
          <summary>외 {remainingFunds.length}개 자금 보기</summary>
          <ul className="option-fund-list">
            {remainingFunds.map((fund) => <li key={fund.id} data-fund-id={fund.id}>{fund.name}</li>)}
          </ul>
        </details>
      )}
      {(option.relationNote || funds.length === 0) && (
        <p className="option-funds-note">
          {option.relationNote || "관련 자금은 답변에 따라 확인해요."}
        </p>
      )}
    </div>
  );
}
function Question({ evaluation, draft, setDraft, onNext, onBack, busy }) {
  const question = evaluation.nextQuestion;
  const headingRef = useRef(null);
  const [invalidNumber, setInvalidNumber] = useState(false);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    setInvalidNumber(false);
  }, [question.id]);
  const selected =
    question.type === "multi" ? (Array.isArray(draft) ? draft : []) : draft;
  const hasSelection =
    question.type === "multi"
      ? selected.length > 0
      : question.type === "number"
        ? selected === "unknown" ||
          (typeof selected === "number" && Number.isFinite(selected) && !invalidNumber)
        : !!selected;
  const options = question.type === "number" && !question.options?.length
    ? [{ value: "unknown", label: "모름 · 확인 필요", description: "자료를 확인한 뒤 다시 입력할 수 있어요." }]
    : question.options || [];
  function select(value) {
    if (question.type !== "multi") return setDraft(value);
    if (["unknown", "none"].includes(value))
      return setDraft(selected.includes(value) ? [] : [value]);
    const withoutUnknown = selected.filter((v) => !["unknown", "none"].includes(v));
    setDraft(
      withoutUnknown.includes(value)
        ? withoutUnknown.filter((v) => v !== value)
        : [...withoutUnknown, value],
    );
  }
  const icons = {
    active: "store",
    paused: "pause",
    closed: "close",
    preparing: "leaf",
    unknown: "help",
    operations: "store",
    equipment: "folder",
    refinance: "reset",
    other: "help",
  };
  return (
    <section
      className="question-card"
      data-testid="question-card"
      data-question-id={question.id}
      aria-busy={busy}
    >
      <div className="question-topline">
        <span className="question-step">
          QUESTION {String(evaluation.answered.length + 1).padStart(2, "0")}
        </span>
        <span className="stage-pill">{question.stage}</span>
      </div>
      <h2 tabIndex={-1} ref={headingRef}>
        {question.title}
      </h2>
      <p className="question-description">{question.description}</p>
      {(question.help?.length > 0 || question.evidence?.length > 0) && (
        <details className="question-reference" key={question.id} data-testid="question-reference">
          <summary>
            기준 설명 · 근거 자료 보기
            <Icon name="chevron" size={16} />
          </summary>
          <div>
            {question.help?.length > 0 && (
              <ul>{question.help.map((item, index) => <li key={index}>{item}</li>)}</ul>
            )}
            {question.evidence?.map((evidence, index) => (
              <p key={index}><Evidence evidence={evidence} /></p>
            ))}
          </div>
        </details>
      )}
      {question.type === "multi" && (
        <p className="multi-hint">
          <Icon name="check" size={14} />
          해당하는 항목을 모두 선택해 주세요.
        </p>
      )}
      {question.type === "number" && (
        <div className="number-answer">
          <label htmlFor={`number-${question.id}`}>정확한 값{question.unit ? ` (${question.unit})` : ""}</label>
          <div className="number-answer-field">
            <input
              id={`number-${question.id}`}
              data-testid="number-answer"
              type="number"
              inputMode={question.step && question.step < 1 ? "decimal" : "numeric"}
              min={question.min}
              max={question.max}
              step={question.step ?? 1}
              value={typeof draft === "number" ? draft : ""}
              disabled={busy}
              aria-invalid={invalidNumber || undefined}
              aria-describedby={invalidNumber ? `number-error-${question.id}` : undefined}
              onChange={(event) => {
                setInvalidNumber(!event.currentTarget.validity.valid);
                setDraft(Number.isFinite(event.currentTarget.valueAsNumber) ? event.currentTarget.valueAsNumber : "");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && hasSelection && !busy) onNext();
              }}
            />
            {question.unit && <span>{question.unit}</span>}
          </div>
          {invalidNumber && (
            <p className="form-error" id={`number-error-${question.id}`}>
              {question.min != null ? `최소 ${question.min}${question.unit || ""} ` : ""}
              {question.max != null ? `최대 ${question.max}${question.unit || ""} ` : ""}
              범위와 입력 단위({question.step ?? 1}{question.unit || ""})를 확인해 주세요.
            </p>
          )}
        </div>
      )}
      <div
        className={`options-grid ${options.length % 2 === 1 && options.at(-1)?.value === "unknown" ? "has-last-option" : ""}`}
        role="group"
        aria-label={question.title}
      >
        {options.map((option) => {
          const isSelected =
            question.type === "multi"
              ? selected.includes(option.value)
              : selected === option.value;
          return (
            <div
              key={`${question.id}-${option.value}`}
              className={`option-card ${isSelected ? "is-selected" : ""}`}
              data-testid={`option-card-${option.value}`}
            >
              <button
                type="button"
                className={`option-button ${isSelected ? "selected" : ""} ${option.value === "unknown" ? "unknown-option" : ""}`}
                data-testid={`option-${option.value}`}
                aria-pressed={isSelected}
                aria-describedby={`option-funds-${question.id}-${option.value}`}
                disabled={busy}
                onClick={() => select(option.value)}
              >
                <span className="option-icon">
                  <Icon name={icons[option.value] || "folder"} size={23} />
                </span>
                <span className="option-text">
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </span>
                <span
                  className={`option-indicator ${question.type === "multi" ? "square" : ""}`}
                >
                  {isSelected && <Icon name="check" size={12} />}
                </span>
              </button>
              <OptionFundRelation option={option} id={`option-funds-${question.id}-${option.value}`} />
            </div>
          );
        })}
      </div>
      <div className="question-actions">
        <button
          type="button"
          className="back-button"
          disabled={busy || evaluation.answered.length === 0}
          onClick={onBack}
        >
          <Icon name="back" size={17} />
          이전 질문
        </button>
        <button
          type="button"
          className="primary-button"
          data-testid="next-button"
          disabled={!hasSelection || busy}
          onClick={onNext}
        >
          {busy ? "확인 중…" : "다음 질문"}
          <Icon name="arrow" size={18} />
        </button>
      </div>
      <div className="question-privacy">
        <Icon name="shield" size={15} />
        상담 내용은 저장되지 않으며, 이 화면에서만 사용돼요.
      </div>
    </section>
  );
}
function FundResult({ fund }) {
  return (
    <article className="fund-result">
      <div className="fund-result-top">
        <span className="fund-result-icon">
          <Icon name="leaf" size={23} />
        </span>
        <div>
          <Badge status={fund.status} />
          <h3>{fund.name}</h3>
        </div>
      </div>
      <p className="fund-description">{fund.description}</p>
      <div className="term-grid">
        {[
          ["limit", "대출 한도"],
          ["rate", "대출 금리"],
          ["period", "대출 기간"],
        ].map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <strong>
              {fund.terms?.[key] || "확인 필요 · 해당 자금 신청안내 확인"}
            </strong>
          </div>
        ))}
      </div>
      <p className="terms-note">유형별 한도·금리·기간이 다를 수 있어요. 표시된 최대한도는 모든 신청자에게 적용되지 않아요.</p>
      {fund.cautions?.length > 0 && (
        <div className="fund-cautions">
          <h4><Icon name="info" size={15} /> 함께 확인할 사항</h4>
          <ul>{fund.cautions.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      )}
      {fund.policyDetails?.length > 0 && (
        <details className="result-details policy-details" data-testid={`policy-details-${fund.id}`}>
          <summary>
            지원 유형 · 특별 조건 자세히 보기
            <Icon name="chevron" size={16} />
          </summary>
          <div className="policy-detail-list">
            <p>유형별 조건을 확인해 주세요. 아래 내용은 해당 유형에 적용되며, 모든 신청자에게 함께 적용되는 조건은 아니에요.</p>
            {fund.policyDetails.map((item, index) => (
              <section key={index}>
                <h4>{item.label || "특별 조건"}</h4>
                <p>{item.detail || "세부 조건 확인 필요"}</p>
                <Evidence evidence={item.evidence} />
              </section>
            ))}
          </div>
        </details>
      )}
      <div className="reception-row">
        <span>현재 접수 상태</span>
        <strong>
          <Icon name="help" size={14} />
          {fund.applicationStatus?.label || "확인 필요"}
        </strong>
        <small>자격 요건과 별도로 확인해 주세요.</small>
      </div>
      <details className="result-details" open>
        <summary>
          판단에 사용된 답변과 확인사항
          <Icon name="chevron" size={16} />
        </summary>
        <ReasonList reasons={fund.reasons} />
      </details>
      <details className="result-details">
        <summary>
          필요 서류 · 신청 절차 · 근거 자료
          <Icon name="chevron" size={16} />
        </summary>
        <div className="result-resources">
          <h4>필요 서류</h4>
          {fund.documents?.length ? (
            <>
              <ul>
                {fund.documents.map((item, i) => (
                  <li key={i}>
                    {typeof item === "string" ? item : item.label || item.name}
                  </li>
                ))}
              </ul>
              {fund.documentsNote && <p>{fund.documentsNote}</p>}
            </>
          ) : (
            <p>
              {fund.documentsNote ||
                "확인 필요 · 자금별 신청안내에서 확인해 주세요."}
            </p>
          )}
          <h4>신청 절차</h4>
          {fund.procedure?.length ? (
            <>
              <ol>
                {fund.procedure.map((item, i) => (
                  <li key={i}>
                    {typeof item === "string"
                      ? item
                      : item.label || item.description}
                  </li>
                ))}
              </ol>
              {fund.procedureNote && <p>{fund.procedureNote}</p>}
            </>
          ) : (
            <p>
              {fund.procedureNote ||
                "확인 필요 · 자금별 신청안내에서 확인해 주세요."}
            </p>
          )}
          <h4>공식 근거 자료</h4>
          {fund.sources?.length ? (
            fund.sources.map((source, i) => (
              <p key={i}>
                <Evidence evidence={{
                  document: source.document || source.name,
                  item: source.item || (source.page ? `p. ${source.page}` : undefined),
                  url: source.url,
                }} />
              </p>
            ))
          ) : (
            <p>
              {fund.sourceNote ||
                "연결된 근거가 없어요. 공식 신청안내를 확인해 주세요."}
            </p>
          )}
          <div className="resource-links">
            {fund.links?.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
                <Icon name="external" size={14} />
              </a>
            ))}
          </div>
        </div>
      </details>
      <div className="source-meta">
        <span>적용 연도: {fund.year || "미확인"}</span>
        <span>자료 확인일: {fund.verifiedAt || "미확인"}</span>
      </div>
    </article>
  );
}
function Results({ evaluation, catalog, onCopy, onPrint, onRestart, busy }) {
  const candidates = evaluation.candidates.filter(
    (c) => c.status !== "ineligible",
  );
  const excluded = evaluation.candidates.filter(
    (c) => c.status === "ineligible",
  );
  return (
    <section className="results" data-testid="results">
      <p className="print-summary"><strong>{SITE_NAME}</strong></p>
      <div className="results-intro">
        <span className="result-check">
          <Icon name={candidates.length ? "check" : "help"} size={25} />
        </span>
        <p className="eyebrow">선택한 내용을 함께 정리했어요</p>
        <h2>
          {candidates.length ? (
            <>
              검토할 후보가 <em>{candidates.length}개</em> 있어요.
            </>
          ) : (
            "현재 답변에 맞는 후보가 없어요."
          )}
        </h2>
        <p>
          {candidates.length
            ? "충족한 조건과 추가로 확인할 내용을 살펴보세요."
            : "아래 미충족 이유를 확인하고, 입력 내용이 맞는지 다시 살펴보세요."}
        </p>
        <div className="result-toolbar">
          <button className="secondary-button" disabled={busy} onClick={onCopy}>
            <Icon name="copy" size={16} />
            결과 복사
          </button>
          <button
            className="secondary-button"
            disabled={busy}
            onClick={onPrint}
          >
            <Icon name="print" size={16} />
            인쇄
          </button>
          <button className="text-button" disabled={busy} onClick={onRestart}>
            <Icon name="reset" size={16} />
            다시 상담하기
          </button>
        </div>
      </div>
      <AssumptionNotice meta={catalog.meta} />
      <div className="result-warning">
        <Icon name="info" size={18} />
        <div>
          <strong>{catalog.meta.notice || DEFAULT_NOTICE}</strong>
          <p>
            {catalog.meta.finalNotice ||
              "최종 지원 여부는 공식 요건 심사와 접수 상황에 따라 결정됩니다."}
          </p>
        </div>
      </div>
      {catalog.meta.coverage && <p className="coverage-note">{catalog.meta.coverage}</p>}
      {candidates.map((fund) => (
        <FundResult key={fund.id} fund={fund} />
      ))}
      {excluded.length > 0 && (
        <section className="excluded-results">
          <h3>
            입력 기준상 요건 미충족 <span>{excluded.length}</span>
          </h3>
          <p>자금별 이유와 근거를 펼쳐 확인할 수 있어요.</p>
          {excluded.map((fund) => (
            <details key={fund.id} className="excluded-fund">
              <summary>
                <span>{fund.name}</span>
                <Icon name="chevron" size={16} />
              </summary>
              <ReasonList
                reasons={fund.reasons.filter((r) => r.status === "failed")}
              />
            </details>
          ))}
        </section>
      )}
      {!candidates.length && (
        <div className="next-guidance">
          <h3>다음으로 확인해 주세요</h3>
          <p>
            선택 내용을 다시 확인하거나, 소상공인 정책자금 공식 누리집에서 해당
            연도의 공고와 지원 요건을 확인해 주세요. 입력 내용이나 확인 서류에
            따라 검토 결과가 달라질 수 있어요.
          </p>
          <a
            href="https://ols.semas.or.kr/ols/man/SMAN010M/page.do"
            target="_blank"
            rel="noreferrer"
          >
            공식 누리집 확인
            <Icon name="external" size={14} />
          </a>
        </div>
      )}
      <section className="print-summary">
        <h3>상담에서 선택한 내용</h3>
        {evaluation.answered.map((answer) => (
          <p key={answer.questionId}>
            <strong>{answer.title}</strong>: {answer.answerLabel}
          </p>
        ))}
      </section>
      <p className="result-data-note">
        적용 연도: {catalog.meta.year || "미확인"} · 데이터 확인일:{" "}
        {catalog.meta.verifiedAt || "미확인"} · 데이터 버전:{" "}
        {catalog.meta.datasetVersion || "미확인"}
      </p>
    </section>
  );
}
function Admin({ api, user }) {
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const data = await api("/api/admin/invites");
    setInvites(data.invites);
  }, [api]);
  useEffect(() => {
    reload()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [reload]);
  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/admin/invites", post({ email: email.trim() }));
      await reload();
      setEmail("");
      setNotice(
        "초대 대상에 추가했어요. 이용자에게 사이트 주소를 전달해 주세요.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke(invite) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/api/admin/invites/${encodeURIComponent(invite.id)}`, {
        method: "DELETE",
        body: "{}",
      });
      await reload();
      setNotice(`${invite.email}의 접근 권한을 회수했어요.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <div className="admin-heading">
        <span className="fund-result-icon">
          <Icon name="shield" size={26} />
        </span>
        <div>
          <p className="eyebrow">관리자 전용</p>
          <h1>함께 상담할 사람 관리</h1>
          <p>
            등록된 이메일만 로그인할 수 있어요. 권한을 회수하면 기존 로그인도
            종료돼요.
          </p>
        </div>
      </div>
      <form className="invite-form" onSubmit={add}>
        <div>
          <label htmlFor="invite-email">초대할 이메일</label>
          <input
            id="invite-email"
            type="email"
            required
            placeholder="colleague@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button className="primary-button" disabled={busy}>
          초대 추가
          <Icon name="arrow" size={17} />
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="inline-message" role="status">
          {notice}
        </p>
      )}
      <div className="invites-heading">
        <h2>초대 대상</h2>
        <span>{invites.filter((i) => i.active).length}명 이용 가능</span>
      </div>
      {loading ? (
        <p className="loading-label">목록을 불러오고 있어요…</p>
      ) : (
        <div className="invite-list">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className={`invite-row ${invite.active ? "" : "revoked"}`}
            >
              <span className="invite-avatar">
                <Icon name="person" size={19} />
              </span>
              <div className="invite-person">
                <strong>{invite.email}</strong>
                <span>
                  {invite.role === "admin" ? "관리자" : "상담직원"} ·{" "}
                  {invite.active ? "접근 가능" : "권한 회수됨"}
                </span>
              </div>
              {invite.active &&
                invite.email !== user.email &&
                invite.role !== "admin" && (
                  <button
                    className="revoke-button"
                    disabled={busy}
                    onClick={() => revoke(invite)}
                  >
                    권한 회수
                  </button>
                )}
            </div>
          ))}
        </div>
      )}
      <div className="admin-note">
        <Icon name="shield" size={18} />
        <p>
          인증용 이메일은 접근 관리에만 사용돼요. 상담 내용과 연결하거나 함께
          저장하지 않아요.
        </p>
      </div>
    </section>
  );
}
const resourceText = (item) =>
  typeof item === "string"
    ? item
    : [
        item.label || item.name || item.document || item.description,
        item.page ? `p. ${item.page}` : item.item,
        item.url,
      ]
        .filter(Boolean)
        .join(" · ");
function resultText(evaluation, catalog) {
  return [
    `${SITE_NAME} · 상담 결과`,
    catalog.meta.notice || DEFAULT_NOTICE,
    catalog.meta.coverage || "",
    `적용 연도: ${catalog.meta.year || "미확인"} / 자료 확인일: ${catalog.meta.verifiedAt || "미확인"}`,
    ...(catalog.meta.assumptionNotice ? [
      "",
      "상담 전제 · 소상공인 기본요건 충족 (별도 확인한 답변이 아닌 가정)",
      catalog.meta.assumptionNotice,
      catalog.meta.assumptionDetails || "",
      ...(catalog.meta.assumedRequirements || []).map((item) => `- 가정한 요건: ${item}`),
    ] : []),
    "",
    "선택한 내용",
    ...evaluation.answered.map((a) => `- ${a.title}: ${a.answerLabel}`),
    "",
    ...evaluation.candidates.flatMap((fund) => [
      fund.name,
      `상태: ${STATUS[fund.status]?.label}`,
      `접수 상태: ${fund.applicationStatus?.label || "확인 필요"}`,
      ...fund.reasons.map(
        (r) =>
          `- [${REASON_LABELS[r.status]}] ${r.label}${r.answerLabel ? ` / 답변: ${r.answerLabel}` : ""} (근거: ${r.evidence?.document || "미등록"} ${r.evidence?.item || ""})`,
      ),
      `한도: ${fund.terms?.limit || "확인 필요"}`,
      `금리: ${fund.terms?.rate || "확인 필요"}`,
      `기간: ${fund.terms?.period || "확인 필요"}`,
      "유형별 한도·금리·기간이 다를 수 있으며 최대한도는 모든 신청자에게 적용되지 않습니다.",
      ...(fund.cautions || []).map((item) => `추가 안내: ${item}`),
      ...(fund.policyDetails || []).map((item) => `유형·특별 조건: ${item.label || "특별 조건"} — ${item.detail || "세부 조건 확인 필요"} (근거: ${resourceText(item.evidence || {}) || "미등록"})`),
      `필요 서류: ${fund.documents?.length ? fund.documents.map(resourceText).join(", ") : fund.documentsNote || "확인 필요"}`,
      `신청 절차: ${fund.procedure?.length ? fund.procedure.map(resourceText).join(" → ") : fund.procedureNote || "확인 필요"}`,
      `자금 적용 연도: ${fund.year || "미확인"} / 자료 확인일: ${fund.verifiedAt || "미확인"}`,
      `근거 문서: ${fund.sources?.length ? fund.sources.map(resourceText).join(" / ") : fund.sourceNote || "공식 근거 미등록"}`,
      ...(fund.links || []).map((l) => `${l.label}: ${l.url}`),
      "",
    ]),
    catalog.meta.finalNotice,
  ].join("\n");
}
function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [catalog, setCatalog] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("consult");
  const [guide, setGuide] = useState(false);
  const generation = useRef(0);
  const guideRef = useRef(null);
  const resetSession = useCallback((message = "") => {
    generation.current++;
    setUser(null);
    setCatalog(null);
    setEvaluation(null);
    setDraft("");
    setError("");
    setNotice(message);
    setTab("consult");
    setGuide(false);
  }, []);
  const api = useCallback(
    async (path, options) => {
      const current = generation.current;
      try {
        const data = await request(path, options);
        if (current !== generation.current)
          throw new Error("로그인 상태가 변경되었어요. 다시 로그인해 주세요.");
        return data;
      } catch (err) {
        if (
          current === generation.current &&
          (err.status === 401 || err.status === 403)
        )
          resetSession(
            "로그인이 만료되었거나 접근 권한이 변경되었어요. 다시 인증해 주세요.",
          );
        throw err;
      }
    },
    [resetSession],
  );
  const initialize = useCallback(
    async (nextUser) => {
      setUser(nextUser);
      setBusy(true);
      setError("");
      setNotice("");
      try {
        const nextCatalog = await api("/api/catalog");
        const nextEvaluation = await api(
          "/api/evaluate",
          post({ answers: {} }),
        );
        setCatalog(nextCatalog);
        setEvaluation(nextEvaluation);
        setDraft("");
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    },
    [api],
  );
  useEffect(() => {
    let mounted = true;
    request("/api/session")
      .then(async (data) => {
        if (mounted && data?.user) await initialize(data.user);
      })
      .catch((err) => {
        if (mounted && err.status !== 401) setNotice(err.message);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, [initialize]);
  const checkSession = useCallback(async () => {
    const data = await api("/api/session");
    if (!data?.user) {
      resetSession("다시 로그인해 주세요.");
      throw new Error("로그인이 필요해요.");
    }
    setUser(data.user);
    return data.user;
  }, [api, resetSession]);
  useEffect(() => {
    if (!user || PUBLIC_SITE) return;
    const check = () =>
      checkSession().catch((err) => {
        if (![401, 403].includes(err.status))
          setError("로그인 상태 확인에 실패했어요. 연결을 확인해 주세요.");
      });
    const interval = window.setInterval(check, 15000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [!!user, checkSession]);
  useEffect(() => {
    if (!guide) return;
    const trigger = document.activeElement;
    const modal = guideRef.current;
    const background = [
      ...document.querySelectorAll(".app-header,.app-main,.app-footer"),
    ];
    background.forEach((element) => {
      element.inert = true;
    });
    const focusable = () =>
      [...modal.querySelectorAll('button,a[href],input,[tabindex="0"]')].filter(
        (element) => !element.disabled,
      );
    focusable()[0]?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setGuide(false);
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      background.forEach((element) => {
        element.inert = false;
      });
      document.removeEventListener("keydown", onKey);
      if (trigger?.isConnected) trigger.focus();
    };
  }, [guide]);
  async function evaluate(answers) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api("/api/evaluate", post({ answers }));
      setEvaluation(data);
      setDraft("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function edit(questionId) {
    const index = evaluation.answered.findIndex(
      (a) => a.questionId === questionId,
    );
    if (index < 0) return;
    const answers = Object.fromEntries(
      evaluation.answered.slice(0, index).map((a) => [a.questionId, a.value]),
    );
    evaluate(answers);
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth/logout", post({}));
      resetSession("안전하게 로그아웃했어요.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    setBusy(true);
    try {
      await checkSession();
      const text = resultText(evaluation, catalog);
      if (!navigator.clipboard?.writeText)
        throw new Error(
          "이 브라우저에서는 복사를 지원하지 않아요. 인쇄 기능을 이용해 주세요.",
        );
      await navigator.clipboard.writeText(text);
      setNotice(
        "결과를 복사했어요. 붙여넣을 곳의 개인정보 관리 기준을 확인해 주세요.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function print() {
    setBusy(true);
    const closedDetails = [
      ...document.querySelectorAll(".results details:not([open])"),
    ];
    try {
      await checkSession();
      closedDetails.forEach((item) => {
        item.open = true;
      });
      window.print();
    } catch (err) {
      setError(err.message);
    } finally {
      closedDetails.forEach((item) => {
        item.open = false;
      });
      setBusy(false);
    }
  }
  if (checking)
    return (
      <div className="loading-page">
        <Brand />
        <p>상담 공간을 준비하고 있어요…</p>
      </div>
    );
  if (!user) return <Login onLogin={initialize} notice={notice} />;
  const answeredCount = evaluation?.answered.length || 0;
  const nextQuestion = evaluation?.nextQuestion;
  const workflowStage = evaluation?.complete ? 3
    : nextQuestion?.stage === "자금 목적" || ["purpose", "purposeConfirm"].includes(nextQuestion?.id) ? 0
    : nextQuestion?.stage === "공통 조건" || nextQuestion?.id === "businessStatusConfirm" ? 1
    : 2;
  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 바로가기
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="주요 메뉴">
            <button
              className={tab === "consult" ? "active" : ""}
              onClick={() => setTab("consult")}
            >
              상담하기
            </button>
            <button onClick={() => setGuide(true)}>이용 안내</button>
            {!PUBLIC_SITE && user.role === "admin" && (
              <button
                className={tab === "admin" ? "active" : ""}
                onClick={() => setTab("admin")}
              >
                접근 관리
              </button>
            )}
          </nav>
          {PUBLIC_SITE ? (
            <span className="public-access-label">
              <Icon name="leaf" size={16} /> 로그인 없이 바로 상담
            </span>
          ) : <div className="user-menu">
            <span className="user-avatar">
              <Icon name="person" size={17} />
            </span>
            <div className="user-details">
              <strong>{user.role === "admin" ? "관리자" : "상담직원"}</strong>
              <span title={user.email}>{user.email}</span>
            </div>
            <button
              className="icon-button logout-button"
              aria-label="로그아웃"
              onClick={logout}
              disabled={busy}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>}
        </div>
      </header>
      <main className="app-main" id="main-content">
        <PolicyNotice meta={catalog?.meta} />
        {error && (
          <div className="global-error" role="alert">
            <Icon name="info" size={17} />
            <span>{error}</span>
            <button className="text-button" onClick={() => setError("")}>
              닫기
            </button>
          </div>
        )}
        {notice && (
          <div className="global-notice" role="status">
            <Icon name="check" size={17} />
            <span>{notice}</span>
            <button className="text-button" onClick={() => setNotice("")}>
              닫기
            </button>
          </div>
        )}
        {tab === "admin" && user.role === "admin" ? (
          <Admin api={api} user={user} />
        ) : (
          <>
            <section className="consult-intro">
              <div>
                <span className="eyebrow">
                  <span className="tiny-dot" />
                  차근차근, 함께 찾는 정책자금
                </span>
                <h1>
                  {evaluation?.complete ? (
                    "상담 결과를 정리했어요."
                  ) : (
                    <>
                      필요한 자금부터
                      <br className="mobile-break" /> 살펴볼까요?
                    </>
                  )}
                </h1>
                <p>한 번에 하나씩 선택하면, 검토할 자금이 정리돼요.</p>
              </div>
              <div className="intro-note">
                <span className="intro-note-icon">
                  <Icon name="leaf" size={26} />
                </span>
                <div>
                  <strong>작은 선택이 모여, 알맞은 다음 걸음</strong>
                  <span>모르는 항목은 ‘확인 필요’로 남겨도 괜찮아요.</span>
                </div>
              </div>
            </section>
            {!evaluation || !catalog ? (
              <div className="loading-content">
                <p>
                  {busy
                    ? "상담 정보를 불러오고 있어요…"
                    : "상담 정보를 불러오지 못했어요."}
                </p>
                {!busy && (
                  <button
                    className="primary-button"
                    onClick={() => initialize(user)}
                  >
                    다시 불러오기
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="workflow-strip" aria-label="상담 진행 단계">
                  {["자금 목적", "공통 확인", "자금별 확인", "상담 결과"].map((label, index) => (
                    <React.Fragment key={label}>
                      {index > 0 && <div className="workflow-divider" />}
                      <div
                        className={`workflow-step ${workflowStage === index ? "current" : workflowStage > index ? "done" : ""}`}
                        aria-current={workflowStage === index ? "step" : undefined}
                      >
                        <span>{index + 1}</span>{label}
                      </div>
                    </React.Fragment>
                  ))}
                  <div className="answer-progress">
                    {answeredCount}개 답변 완료
                  </div>
                </div>
                <div className="consult-layout">
                  <div className="primary-column">
                    {evaluation.complete ? (
                      <Results
                        evaluation={evaluation}
                        catalog={catalog}
                        onCopy={copy}
                        onPrint={print}
                        onRestart={() => evaluate({})}
                        busy={busy}
                      />
                    ) : (
                      <>
                        <AssumptionNotice meta={catalog.meta} />
                        <Question
                          evaluation={evaluation}
                          draft={draft}
                          setDraft={setDraft}
                          busy={busy}
                          onNext={() =>
                            evaluate({
                              ...evaluation.answers,
                              [evaluation.nextQuestion.id]: draft,
                            })
                          }
                          onBack={() =>
                            edit(evaluation.answered.at(-1)?.questionId)
                          }
                        />
                        <div className="below-question">
                          <Icon name="help" size={17} />
                          <span>
                            선택이 어렵다면 <strong>‘모름 · 확인 필요’</strong>
                            를 골라주세요.
                          </span>
                          <button onClick={() => setGuide(true)}>
                            이용 안내
                            <Icon name="arrow" size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <aside className="consult-sidebar">
                    <Summary
                      evaluation={evaluation}
                      busy={busy}
                      onEdit={edit}
                    />
                    <CandidateSidebar candidates={evaluation.candidates} />
                    {!evaluation.complete && answeredCount > 0 && (
                      <button
                        className="restart-link"
                        disabled={busy}
                        onClick={() => evaluate({})}
                      >
                        <Icon name="reset" size={15} />
                        다시 상담하기
                      </button>
                    )}
                  </aside>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <footer className="app-footer">
        <span>
          <Icon name="leaf" size={14} />
          {SITE_NAME}
        </span>
        <p>최종 지원 여부는 심사 및 접수 상황에 따라 결정됩니다.</p>
        <span className="footer-privacy">
          <Icon name="shield" size={13} />
          상담 내용 미저장
        </span>
      </footer>
      {guide && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGuide(false);
          }}
        >
          <section
            className="guide-dialog"
            ref={guideRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
          >
            <button
              className="icon-button dialog-close"
              aria-label="이용 안내 닫기"
              onClick={() => setGuide(false)}
            >
              <Icon name="close" />
            </button>
            <span className="login-lock">
              <Icon name="leaf" size={28} />
            </span>
            <h2 id="guide-title">{SITE_NAME} 이용 안내</h2>
            <ol>
              <li>
                <strong>한 질문씩 선택해 주세요.</strong>
                <p>
                  여러 항목에 해당하면 모두 선택할 수 있어요. 모르는 내용은
                  ‘확인 필요’로 남겨요.
                </p>
              </li>
              <li>
                <strong>후보와 선택 내용을 함께 살펴보세요.</strong>
                <p>
                  요건 미충족 후보도 펼쳐 이유를 볼 수 있어요. 답변을 바꾸면
                  영향을 받는 질문을 다시 확인해요.
                </p>
              </li>
              <li>
                <strong>결과를 확인하고 필요한 내용을 이어가세요.</strong>
                <p>
                  결과를 복사하거나 인쇄할 수 있어요. 새로고침{PUBLIC_SITE ? "하면" : " 또는 로그아웃하면"}
                  상담 내용은 사라져요.
                </p>
              </li>
            </ol>
            <div className="result-warning">
              <Icon name="info" size={19} />
              <p>
                {catalog?.meta.notice || DEFAULT_NOTICE}
                {" "}확인하지 못한 조건은 ‘확인 필요’로 남기며, 최종 지원 여부는
                심사와 접수 상황에 따라 결정돼요.
              </p>
            </div>
            <button
              className="primary-button full"
              onClick={() => setGuide(false)}
            >
              확인했어요
            </button>
          </section>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);

import React, { useEffect, useRef, useState } from "react";
import { creditStaffGuide } from "../policy/credit-guide.js";
import "./credit-guide.css";

function GuideIcon({ name, size = 18 }) {
  const paths = {
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    print: <path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7Z" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    book: <><path d="M12 5c-3-2-7-2-10 0v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 0Z" /><path d="M12 5v15" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-9v.1" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    external: <><path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.info}</svg>;
}

function Source({ evidence }) {
  if (!evidence) return null;
  return (
    <p className="credit-guide-evidence">
      <strong>근거</strong> {evidence.document}{evidence.section ? ` · ${evidence.section}` : ""}
      {evidence.url && <a href={evidence.url} target="_blank" rel="noreferrer">공식 누리집 <GuideIcon name="external" size={12} /></a>}
    </p>
  );
}

function matches(item, terms) {
  const text = [item.title, item.summary, ...(item.details || []), ...(item.tags || [])].join(" ").toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
}

export default function CreditGuide({ onBack }) {
  const guide = creditStaffGuide;
  const rootRef = useRef(null);
  const headingRef = useRef(null);
  const printStateRef = useRef(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const sections = guide.sections || [];
  const itemCount = sections.reduce((total, section) => total + section.items.length, 0);
  const visibleCount = sections.reduce((total, section) => total + (
    category === "all" || category === section.id ? section.items.filter((item) => matches(item, terms)).length : 0
  ), 0);

  useEffect(() => { headingRef.current?.focus(); }, []);

  function preparePrint() {
    if (printStateRef.current || !rootRef.current) return;
    const details = [...rootRef.current.querySelectorAll("details")];
    printStateRef.current = details.map((detail) => ({ detail, open: detail.open }));
    details.forEach((detail) => { detail.open = true; });
  }

  function restorePrint() {
    printStateRef.current?.forEach(({ detail, open }) => { detail.open = open; });
    printStateRef.current = null;
  }

  useEffect(() => {
    window.addEventListener("beforeprint", preparePrint);
    window.addEventListener("afterprint", restorePrint);
    return () => {
      window.removeEventListener("beforeprint", preparePrint);
      window.removeEventListener("afterprint", restorePrint);
      restorePrint();
    };
  }, []);

  function printGuide() {
    try {
      preparePrint();
      window.print();
    } finally {
      restorePrint();
    }
  }

  function clearFilters() {
    setQuery("");
    setCategory("all");
  }

  return (
    <section className="credit-guide" data-testid="credit-guide" ref={rootRef} aria-labelledby="credit-guide-title">
      <div className="credit-guide-toolbar">
        <button className="credit-guide-back" type="button" data-testid="credit-guide-back" onClick={onBack}>
          <GuideIcon name="back" /> 상담으로 돌아가기
        </button>
        <button className="credit-guide-print" type="button" data-testid="credit-guide-print" onClick={printGuide}>
          <GuideIcon name="print" /> 전체 안내 인쇄
        </button>
      </div>

      <header className="credit-guide-heading">
        <p className="credit-guide-eyebrow"><GuideIcon name="book" /> 직원용 자금 안내</p>
        <h1 id="credit-guide-title" ref={headingRef} tabIndex={-1}>{guide.title}</h1>
        <p className="credit-guide-subtitle">{guide.subtitle || guide.intro}</p>
        <div className="credit-guide-dates">
          <span>{guide.year}년 제공 지침</span>
          <span>지침 개정일 <time>{guide.sourceRevision}</time></span>
          <span>안내 검토일 <time>{guide.reviewedAt}</time></span>
        </div>
      </header>

      <div className="credit-guide-notice" role="note">
        <GuideIcon name="info" />
        <div>
          <strong>현재 접수 여부·예산은 별도로 확인해 주세요.</strong>
          <p>아래 내용은 제공 지침의 신청 기준과 직원 확인사항입니다. 상담 화면은 소상공인 기본요건 충족을 전제로 하지만, 실제 신청 때는 기본요건과 증빙도 확인해야 합니다. 최종 지원 여부는 심사와 접수 상황에 따라 결정됩니다.</p>
        </div>
      </div>

      <section className="credit-guide-highlights" aria-label="핵심 기준 요약">
        {(guide.highlights || []).map((item) => (
          <article className="credit-guide-highlight" key={item.id}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.note && <p>{item.note}</p>}
            {item.evidence && <details className="credit-highlight-source"><summary>기준 근거 보기</summary><Source evidence={item.evidence} /></details>}
          </article>
        ))}
      </section>

      <div className="credit-guide-finder">
        <div className="credit-guide-search-wrap">
          <label htmlFor="credit-guide-search">필요한 정보 찾기</label>
          <div className="credit-guide-search-field">
            <GuideIcon name="search" />
            <input id="credit-guide-search" data-testid="credit-guide-search" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 교육, 임차, 체납" aria-describedby="credit-guide-search-status" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">지우기</button>}
          </div>
        </div>
        <div className="credit-guide-categories" role="group" aria-label="안내 항목 선택">
          <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>전체 보기</button>
          {sections.map((section) => (
            <button type="button" key={section.id} aria-pressed={category === section.id} onClick={() => setCategory(section.id)}>{section.title}</button>
          ))}
        </div>
        <p className="credit-guide-search-status" id="credit-guide-search-status" aria-live="polite">
          {terms.length || category !== "all" ? `전체 ${itemCount}개 중 ${visibleCount}개 항목` : "먼저 요약을 보고, 자세한 조건과 근거를 펼쳐 확인하세요."}
        </p>
      </div>

      <div className="credit-guide-sections">
        {sections.map((section, sectionIndex) => {
          const visible = (category === "all" || category === section.id) && section.items.some((item) => matches(item, terms));
          return (
            <section className="credit-guide-section" data-testid={`credit-guide-section-${section.id}`} key={section.id} hidden={!visible} aria-labelledby={`credit-guide-heading-${section.id}`}>
              <div className="credit-guide-section-heading">
                <span className="credit-guide-section-number">{String(sectionIndex + 1).padStart(2, "0")}</span>
                <div><h2 id={`credit-guide-heading-${section.id}`}>{section.title}</h2><p>{section.summary}</p></div>
              </div>
              <div className="credit-guide-items">
                {section.items.map((item) => (
                  <details className="credit-guide-item" data-testid={`credit-guide-item-${item.id}`} key={item.id} hidden={!matches(item, terms)}>
                    <summary>
                      <span className="credit-guide-item-summary">
                        <span className="credit-guide-item-title"><strong>{item.title}</strong>{(item.tags || []).map((tag) => <span className="credit-guide-tag" key={tag}>{tag}</span>)}</span>
                        <span className="credit-guide-item-description">{item.summary}</span>
                      </span>
                      <GuideIcon name="chevron" size={17} />
                    </summary>
                    <div className="credit-guide-item-details">
                      {item.details?.length > 0 && <ul>{item.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>}
                      <Source evidence={item.evidence} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {visibleCount === 0 && (
        <div className="credit-guide-empty" role="status">
          <GuideIcon name="search" size={28} />
          <h2>일치하는 안내 항목이 없어요.</h2>
          <p>다른 검색어를 입력하거나 전체 안내를 확인해 주세요.</p>
          <button type="button" onClick={clearFilters}>검색·항목 선택 초기화</button>
        </div>
      )}

      <footer className="credit-guide-sources">
        <h2>근거와 공식 확인</h2>
        {guide.intro && guide.intro !== guide.subtitle && <p>{guide.intro}</p>}
        <Source evidence={guide.source} />
        {guide.cautions?.length > 0 && <ul>{guide.cautions.map((caution, index) => <li key={index}>{caution}</li>)}</ul>}
        <div className="credit-guide-links">
          {(guide.links || []).map((link) => <a href={link.url} target="_blank" rel="noreferrer" key={`${link.url}-${link.label}`}>{link.label}<GuideIcon name="external" size={14} /></a>)}
        </div>
        <p className="credit-guide-print-note">인쇄에는 검색·항목 선택과 관계없이 전체 안내와 근거가 포함됩니다.</p>
      </footer>
    </section>
  );
}

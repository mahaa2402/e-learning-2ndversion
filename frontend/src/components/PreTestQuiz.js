import React, { useState } from 'react';

function PreTestQuiz({ courseTitle, questions, onCompleted }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleAnswerChange = (qIndex, option) => {
    setAnswers(prev => ({ ...prev, [qIndex]: option }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    let score = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] && answers[idx] === q.correctAnswer) {
        score += q.points || 1;
      }
    });

    const total = questions.reduce((sum, q) => sum + (q.points || 1), 0);
    onCompleted({ score, total, answers });
  };

  return (
    <div className="pretest-wrapper">
      <div className="pretest-card">
        <h2 className="pretest-title">Pre Test – {courseTitle}</h2>
        <p className="pretest-subtitle">Please answer the following questions before starting the course modules.</p>
        <form onSubmit={handleSubmit}>
          {questions.map((q, idx) => (
            <div key={idx} className="pretest-question">
              <p className="pretest-question-text">{idx + 1}. {q.question}</p>
              <div className="pretest-options">
                {(q.options || []).map((opt, optIdx) => (
                  <label key={optIdx} className="pretest-option">
                    <input
                      type="radio"
                      name={`pretest-q-${idx}`}
                      value={opt}
                      checked={answers[idx] === opt}
                      onChange={() => handleAnswerChange(idx, opt)}
                      required={!answers[idx]}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="submit" className="pretest-submit-btn" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Pre Test'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PreTestQuiz;

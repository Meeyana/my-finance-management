const ALLOWED_SENDERS = [
  'info@myvib.vib.com.vn',
  'info@card.vib.com.vn',
];

const CREDIT_SENDER = 'info@card.vib.com.vn';

const PROP = {
  ingestUrl: 'FINANCE_INGEST_URL',
  ingestSecret: 'FINANCE_INGEST_SECRET',
  gmailQuery: 'FINANCE_GMAIL_QUERY',
  maxMessages: 'FINANCE_MAX_MESSAGES',
  seenIds: 'FINANCE_SEEN_MESSAGE_IDS',
};

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  const ingestUrl = props.getProperty(PROP.ingestUrl);
  const ingestSecret = props.getProperty(PROP.ingestSecret);

  if (!ingestUrl) throw new Error('Missing Script Property: FINANCE_INGEST_URL');
  if (!ingestSecret) throw new Error('Missing Script Property: FINANCE_INGEST_SECRET');

  return {
    ingestUrl: ingestUrl,
    ingestSecret: ingestSecret,
    gmailQuery:
      props.getProperty(PROP.gmailQuery) ||
      'newer_than:3d {from:info@myvib.vib.com.vn from:info@card.vib.com.vn}',
    maxMessages: Number(props.getProperty(PROP.maxMessages) || 20),
  };
}

/** Chạy một lần để tạo trigger mỗi phút. */
function setup() {
  const props = PropertiesService.getScriptProperties();

  props.setProperties({
    [PROP.ingestUrl]: 'https://tp-finance.netlify.app/api/finance/ingest',
    [PROP.gmailQuery]:
      'newer_than:3d {from:info@myvib.vib.com.vn from:info@card.vib.com.vn}',
    [PROP.maxMessages]: '20',
  }, false);

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'processFinanceEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('processFinanceEmails')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('Setup completed');
}

/** Hàm chính, được gọi mỗi phút. */
function processFinanceEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    Logger.log('Another execution is still running');
    return;
  }

  try {
    const config = getConfig();
    const seenIds = loadSeenIds();
    const candidates = findCandidateMessages(config);
    let processed = 0;

    candidates.sort(function (left, right) {
      return left.message.getDate().getTime() - right.message.getDate().getTime();
    });

    for (const item of candidates) {
      if (processed >= config.maxMessages) break;

      const messageId = item.message.getId();
      if (seenIds.indexOf(messageId) !== -1) continue;

      try {
        const payload = buildFinancePayload(item.message, item.thread);
        const result = postToFinance(payload, config);
        logPostResult(payload, result);

        if (result.remember) seenIds.push(messageId);
      } catch (error) {
        // Không đánh dấu đã xử lý để trigger có thể thử lại sau khi parser được sửa.
        Logger.log(JSON.stringify({
          messageId: messageId,
          success: false,
          remember: false,
          error: String(error),
        }));
      }

      processed++;
    }

    saveSeenIds(seenIds);
    Logger.log('Processed messages: ' + processed);
  } finally {
    lock.releaseLock();
  }
}

/** Preview email VIB mới nhất, không gửi backend. */
function previewLatestFinanceEmail() {
  const config = getConfig();
  const candidates = findCandidateMessages(config);

  candidates.sort(function (left, right) {
    return right.message.getDate().getTime() - left.message.getDate().getTime();
  });

  if (!candidates.length) {
    Logger.log('No VIB email found');
    return;
  }

  Logger.log(JSON.stringify(
    buildFinancePayload(candidates[0].message, candidates[0].thread),
    null,
    2
  ));
}

/** Preview riêng email tín dụng mới nhất, không gửi backend. */
function previewLatestCreditEmail() {
  const item = findLatestCreditMessage(getConfig());
  if (!item) {
    Logger.log('No VIB credit email found');
    return;
  }

  const payload = buildFinancePayload(item.message, item.thread);
  Logger.log(JSON.stringify({
    messageId: payload.messageId,
    sender: payload.sender,
    subject: payload.subject,
    accountType: payload.accountType,
    sourceAccountLast4: payload.sourceAccountLast4,
    amount: payload.amount,
    merchant: payload.merchant,
    occurredAt: payload.occurredAt,
  }, null, 2));
}

/**
 * Gửi lại email tín dụng mới nhất dù messageId từng bị đánh dấu đã xử lý.
 * Backend chống trùng theo Gmail messageId nên chạy lại an toàn.
 */
function retryLatestCreditEmail() {
  const config = getConfig();
  const item = findLatestCreditMessage(config);
  if (!item) throw new Error('No VIB credit email found');

  const messageId = item.message.getId();
  const seenIds = loadSeenIds().filter(function (id) {
    return id !== messageId;
  });
  const payload = buildFinancePayload(item.message, item.thread);
  const result = postToFinance(payload, config);
  logPostResult(payload, result);

  if (result.remember) seenIds.push(messageId);
  saveSeenIds(seenIds);

  if (!result.success) {
    throw new Error(
      'Credit ingestion failed: HTTP ' + result.httpCode + ' ' + result.body
    );
  }
}

function findLatestCreditMessage(config) {
  const candidates = findCandidateMessages(config).filter(function (item) {
    return extractEmailAddress(item.message.getFrom()) === CREDIT_SENDER;
  });
  candidates.sort(function (left, right) {
    return right.message.getDate().getTime() - left.message.getDate().getTime();
  });
  return candidates[0] || null;
}

function findCandidateMessages(config) {
  const threads = GmailApp.search(config.gmailQuery, 0, 50);
  const result = [];

  for (const thread of threads) {
    for (const message of thread.getMessages()) {
      const sender = extractEmailAddress(message.getFrom());
      if (!ALLOWED_SENDERS.includes(sender)) continue;
      result.push({ thread: thread, message: message });
    }
  }

  return result;
}

function buildFinancePayload(message, thread) {
  const sender = extractEmailAddress(message.getFrom());
  const html = message.getBody() || '';
  const text = message.getPlainBody() || '';
  const subject = message.getSubject() || '';

  if (!html && !text && !subject) {
    throw new Error('Gmail message has no parsable content');
  }

  const common = {
    messageId: String(message.getId()),
    threadId: String(thread.getId()),
    sender: sender,
    subject: subject,
    html: html,
    text: text,
    snippet: text.substring(0, 500),
    receivedAt: message.getDate().toISOString(),
  };

  return sender === CREDIT_SENDER ? parseCreditPayload(common) : common;
}

function parseCreditPayload(payload) {
  const textBody = String(payload.text || '').trim();
  const htmlBody = stripHtml(payload.html);
  const bodies = [textBody, htmlBody].filter(function (value, index, values) {
    return value && values.indexOf(value) === index;
  });

  // Gmail đôi khi trả plain body chỉ có phần mô tả/ảnh, còn bảng giao dịch
  // nằm trong HTML. Không ưu tiên tuyệt đối một nguồn; tìm field trên từng bản.
  const pick = function (pattern) {
    for (const body of bodies) {
      const match = body.match(pattern);
      if (match && match[1]) return match[1].replace(/\s+/g, ' ').trim();
    }
    return null;
  };

  const findCardLast4 = function () {
    for (const body of bodies) {
      const cardSection = body.match(
        /Số\s*thẻ\s*:?\s*([\s\S]{1,100}?)(?=\s*(?:Chủ\s*thẻ|Giao\s*dịch|Giá\s*trị|Vào\s*lúc|Tại)\s*:|$)/i
      );
      if (!cardSection || !cardSection[1]) continue;
      const digits = cardSection[1].replace(/\D/g, '');
      if (digits.length >= 4) return digits.slice(-4);
    }
    return null;
  };

  const cardLast4 = findCardLast4();
  const amountText = pick(/Giá\s*trị\s*:\s*([\d.,]+\s*VND)/i);
  const amount = amountText ? Number(amountText.replace(/[^\d]/g, '')) : null;
  const plainText = bodies.find(function (body) {
    return /Số\s*thẻ/i.test(body) && /Giá\s*trị/i.test(body);
  }) || bodies[0] || '';

  if (!cardLast4) {
    throw new Error(
      'Cannot parse VIB credit card last4' +
      ' (plainHasCardLabel=' + /Số\s*thẻ/i.test(textBody) +
      ', htmlHasCardLabel=' + /Số\s*thẻ/i.test(htmlBody) + ')'
    );
  }
  if (!amount) throw new Error('Cannot parse VIB credit transaction amount');

  return Object.assign({}, payload, {
    text: plainText,
    accountType: 'credit_card',
    kind: 'credit_card_purchase',
    sourceAccountLast4: cardLast4,
    cardLast4: cardLast4,
    cardholder: pick(/Chủ thẻ\s*:\s*([\s\S]*?)(?=\s+Giao dịch\s*:)/i),
    transactionType: pick(/Giao dịch\s*:\s*([\s\S]*?)(?=\s+Giá trị\s*:)/i),
    merchant: pick(/Tại\s*:?\s*([^\r\n]{2,160})/i),
    amountText: amountText,
    amount: amount,
    occurredAt: pick(
      /Vào lúc\s*:\s*(\d{1,2}:\d{2}\s+\d{1,2}\/\d{1,2}\/\d{4})/i
    ),
  });
}

function postToFinance(payload, config) {
  try {
    const response = UrlFetchApp.fetch(config.ingestUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-finance-ingest-secret': config.ingestSecret,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const httpCode = response.getResponseCode();
    const body = response.getContentText();
    const success = httpCode >= 200 && httpCode < 300;
    let responseData = null;

    try {
      responseData = JSON.parse(body);
    } catch (error) {
      responseData = null;
    }

    const errorCode = responseData && responseData.error
      ? String(responseData.error)
      : null;
    const retryableApplicationError = [
      'parse_failed',
      'unmatched_or_disabled_account',
      'ingestion_not_configured',
    ].includes(errorCode);
    const permanentClientError =
      httpCode >= 400 &&
      httpCode < 500 &&
      ![401, 408, 429].includes(httpCode) &&
      !retryableApplicationError;

    return {
      success: success,
      remember: success || permanentClientError,
      httpCode: httpCode,
      errorCode: errorCode,
      body: body.substring(0, 1000),
    };
  } catch (error) {
    return {
      success: false,
      remember: false,
      httpCode: 0,
      errorCode: null,
      body: String(error),
    };
  }
}

function logPostResult(payload, result) {
  Logger.log(JSON.stringify({
    messageId: payload.messageId,
    sender: payload.sender,
    sourceAccountLast4: payload.sourceAccountLast4 || null,
    amount: payload.amount || null,
    merchant: payload.merchant || null,
    httpCode: result.httpCode,
    errorCode: result.errorCode,
    success: result.success,
    remember: result.remember,
    response: result.body,
  }));
}

function extractEmailAddress(value) {
  const raw = String(value || '');
  const match = raw.match(/<([^<>@\s]+@[^<>\s]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/td>|<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function loadSeenIds() {
  const raw = PropertiesService
    .getScriptProperties()
    .getProperty(PROP.seenIds);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveSeenIds(ids) {
  const uniqueIds = Array.from(new Set(ids)).slice(-300);
  PropertiesService
    .getScriptProperties()
    .setProperty(PROP.seenIds, JSON.stringify(uniqueIds));
}

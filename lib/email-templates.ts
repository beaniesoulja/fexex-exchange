// Shared HTML email layout for FEXEX transactional emails.
// Table-based markup with inline styles throughout — this is the layout
// technique that actually renders consistently across Outlook, Gmail, and
// Apple Mail, unlike the flexbox/class-based markup the rest of the app uses.

const COLORS = {
  bg: "#161818",
  card: "#202323",
  border: "#f4f3ee1a",
  text: "#f4f3ee",
  muted: "#a9afa9",
  accent: "#c6f65c",
  accentText: "#161818",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type EmailLayoutOptions = {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footnoteHtml: string;
};

export function renderEmailLayout({ preheader, heading, bodyHtml, ctaLabel, ctaUrl, footnoteHtml }: EmailLayoutOptions) {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>FEXEX</title>
</head>
<body style="margin:0; padding:0; background-color:${COLORS.bg}; -webkit-text-size-adjust:100%; text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${escapeHtml(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%;">
          <tr>
            <td style="padding:0 8px 24px 8px;">
              <span style="font-family:Arial, Helvetica, sans-serif; font-size:20px; font-weight:bold; color:${COLORS.accent}; letter-spacing:0.5px;">FEXEX</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:${COLORS.card}; border:1px solid ${COLORS.border}; border-radius:16px; padding:32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:28px; font-weight:bold; color:${COLORS.text}; padding-bottom:16px;">
                    ${escapeHtml(heading)}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:${COLORS.muted};">
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 0 8px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius:10px; background-color:${COLORS.accent};">
                          <a href="${ctaUrl}" style="display:inline-block; padding:14px 28px; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; color:${COLORS.accentText}; text-decoration:none; border-radius:10px;">${escapeHtml(ctaLabel)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; color:${COLORS.muted}; padding-top:20px; word-break:break-all;">
                    Or paste this link into your browser:<br />
                    <a href="${ctaUrl}" style="color:${COLORS.muted};">${ctaUrl}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; color:${COLORS.muted}; padding:20px 8px 0 8px;">
              ${footnoteHtml}
              <br /><br />
              &copy; ${year} FEXEX. This is an automated message, please don't reply directly to it.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

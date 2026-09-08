import nodemailer from 'nodemailer';

// Use real Gmail transporter — explicit SMTP config is more reliable than service:'gmail'
const getTransporter = () => {
  const user = process.env.EMAIL_USER?.trim() || '';
  const pass = process.env.EMAIL_APP_PASSWORD?.replace(/\s+/g, '') || '';
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
};

export const initMailer = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log(`[Mailer] Gmail transporter ready. Sending as: ${process.env.EMAIL_USER}`);
  } catch (error) {
    console.error('[Mailer] Gmail transporter failed to verify — check EMAIL_USER and EMAIL_APP_PASSWORD in .env', error);
  }
};

export const sendSessionEmail = async (
  toEmail: string,
  studentName: string,
  sessionDetails: {
    topic: string;
    startTime: string;
    endTime: string;
    classMode: string;
    link: string;
    subject?: string;
    level?: string;
    tutorName?: string;
    tutorEmail?: string;
    assetUrl?: string | null;
  }
) => {
  const startDateObj = new Date(sessionDetails.startTime);
  const endDateObj = new Date(sessionDetails.endTime);
  const startDate = startDateObj.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const endDate = endDateObj.toLocaleTimeString('en-US', { timeStyle: 'short' });

  const formattedLevel = sessionDetails.level === '+1' || sessionDetails.level === '+2' 
    ? `${sessionDetails.level} Std` 
    : (sessionDetails.level || 'Standard');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #ff5734; margin: 0; font-size: 24px;">🎓 TutorFlow - Class Scheduled!</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">A new lesson has been planned for you</p>
      </div>

      <p style="font-size: 15px; color: #1e293b;">Hi <strong>${studentName}</strong>,</p>
      <p style="font-size: 14px; color: #475569;">Your tutor <strong>${sessionDetails.tutorName || 'Your Tutor'}</strong> has scheduled a new session. Here are the details:</p>
      
      <!-- Tutor Info Box -->
      <div style="background-color: #f8fafc; border-left: 4px solid #ff5734; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
        <h4 style="margin: 0 0 6px 0; color: #1e293b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">👨‍🏫 Tutor Details</h4>
        <p style="margin: 3px 0; font-size: 14px; color: #334155;"><strong>Name:</strong> ${sessionDetails.tutorName || 'N/A'}</p>
        ${sessionDetails.tutorEmail ? `<p style="margin: 3px 0; font-size: 14px; color: #334155;"><strong>Email:</strong> ${sessionDetails.tutorEmail}</p>` : ''}
      </div>

      <!-- Class Details Box -->
      <div style="background-color: #f1f5f9; padding: 18px; border-radius: 12px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">📚 Lesson Overview</h4>
        <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Topic:</strong> ${sessionDetails.topic}</p>
        ${sessionDetails.subject ? `<p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Subject:</strong> ${sessionDetails.subject}</p>` : ''}
        ${sessionDetails.level ? `<p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Class / Level:</strong> ${formattedLevel}</p>` : ''}
        <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Date & Time:</strong> ${startDate} - ${endDate}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Mode:</strong> ${sessionDetails.classMode === 'VIDEO_CALL' ? '🎥 Live Video Call' : '📄 Class Asset / Notes'}</p>
        ${sessionDetails.assetUrl ? `
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
            <p style="margin: 4px 0; font-size: 14px; color: #0f172a;"><strong>📎 Attached Class File / Link:</strong></p>
            <a href="${sessionDetails.assetUrl.startsWith('http') ? sessionDetails.assetUrl : `http://localhost:5000${sessionDetails.assetUrl}`}" target="_blank" style="color: #2563eb; font-size: 13px; word-break: break-all;">
              ${sessionDetails.assetUrl.startsWith('http') ? sessionDetails.assetUrl : `http://localhost:5000${sessionDetails.assetUrl}`}
            </a>
          </div>
        ` : ''}
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${sessionDetails.link}" style="background-color: #ff5734; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(255, 87, 52, 0.25);">
          Open Class Session
        </a>
      </div>
      
      <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center;">If the button doesn't work, copy and paste this URL into your browser:<br/><a href="${sessionDetails.link}" style="color: #2563eb;">${sessionDetails.link}</a></p>
    </div>
  `;

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"TutorFlow" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `📚 Scheduled Class: ${sessionDetails.topic}`,
      html: htmlContent,
    });
    console.log(`[Mailer] Session email sent to ${toEmail}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[Mailer] Error sending session email:', error);
    throw error;
  }
};

export const sendWelcomeStudentEmail = async (opts: {
  name: string;
  email: string;
  password: string;
  subject: string;
  level: string;
  gender: string;
  learningGoals: string;
  weakAreas: string;
  tutorName?: string;
  tutorEmail?: string;
}) => {
  const formattedLevel =
    opts.level === '+1' || opts.level === '+2' ? `${opts.level} Std` : opts.level;

  const mailBody = `Hello ${opts.name},

Welcome to TutorFlow! 🎓

Your tutor has created a student account for you on TutorFlow.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        YOUR TUTOR DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tutor Name  : ${opts.tutorName || 'Your Tutor'}
Tutor Email : ${opts.tutorEmail || ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      YOUR ACCOUNT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name              : ${opts.name}
Email             : ${opts.email}
Temporary Password: ${opts.password}

Subject           : ${opts.subject}
Class             : ${formattedLevel}
Gender            : ${opts.gender}

Learning Goals    : ${opts.learningGoals}
Weak Areas        : ${opts.weakAreas}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can now log in to TutorFlow using the email and password above.
Please change your password after your first login.

Best regards,
TutorFlow Team`;

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"TutorFlow" <${process.env.EMAIL_USER}>`,
    to: opts.email,
    subject: 'Welcome to TutorFlow - Your Student Account Details',
    text: mailBody,
  });

  console.log(`[Mailer] Welcome email sent to ${opts.email}: ${info.messageId}`);
  return info;
};



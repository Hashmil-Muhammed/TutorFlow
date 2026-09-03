import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter;

// Initialize Ethereal Email for testing
export const initMailer = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    console.log(`[Mailer] Ethereal Email initialized. User: ${testAccount.user}`);
  } catch (error) {
    console.error("[Mailer] Failed to initialize mailer", error);
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
  }
) => {
  if (!transporter) {
    console.warn("Transporter not initialized yet.");
    return;
  }

  const startDate = new Date(sessionDetails.startTime).toLocaleString();
  const endDate = new Date(sessionDetails.endTime).toLocaleString();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #2563eb;">TutorFlow - New Class Scheduled!</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your tutor has scheduled a new class for you. Here are the details:</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Topic:</strong> ${sessionDetails.topic}</p>
        <p style="margin: 5px 0;"><strong>Start Time:</strong> ${startDate}</p>
        <p style="margin: 5px 0;"><strong>End Time:</strong> ${endDate}</p>
        <p style="margin: 5px 0;"><strong>Class Mode:</strong> ${sessionDetails.classMode}</p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${sessionDetails.link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Join Live Room
        </a>
      </div>
      
      <p style="margin-top: 30px; font-size: 12px; color: #64748b;">If the button doesn't work, copy and paste this link: ${sessionDetails.link}</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"TutorFlow" <noreply@tutorflow.com>',
      to: toEmail,
      subject: `New Class Scheduled: ${sessionDetails.topic}`,
      html: htmlContent,
    });

    console.log(`[Mailer] Message sent: ${info.messageId}`);
    console.log(`[Mailer] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    return info;
  } catch (error) {
    console.error("[Mailer] Error sending email:", error);
  }
};

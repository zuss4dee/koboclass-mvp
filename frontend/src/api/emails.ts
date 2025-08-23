import { Resend } from 'resend';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export interface ClassPurchaseEmailData {
  userEmail: string;
  userName: string;
  className: string;
  hostName: string;
  classDate: string;
  classTime: string;
  duration: string;
  price: string;
  ticketId: string;
}

export interface ClassReminderEmailData {
  userEmail: string;
  userName: string;
  className: string;
  hostName: string;
  classDate: string;
  classTime: string;
  duration: string;
  joinUrl: string;
  reminderType: '24h' | '1h' | 'starting';
}

// Send class purchase confirmation email
export const sendPurchaseConfirmationEmail = async (data: ClassPurchaseEmailData) => {
  try {
    const emailTemplate: EmailTemplate = {
      to: data.userEmail,
      subject: `✅ Class Purchased: ${data.className}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Class Purchase Confirmation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f6f3; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #D9572B 0%, #F4A261 100%); padding: 40px 30px; text-align: center; }
            .logo { color: #ffffff; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: #ffffff; font-size: 18px; margin: 0; }
            .content { padding: 40px 30px; }
            .class-card { background-color: #f8f6f3; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .class-title { font-size: 24px; font-weight: bold; color: #2C3E50; margin: 0 0 8px 0; }
            .host-name { color: #7F8C8D; font-size: 16px; margin: 0 0 16px 0; }
            .class-details { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; }
            .detail-item { display: flex; align-items: center; gap: 8px; color: #2C3E50; }
            .detail-icon { width: 16px; height: 16px; }
            .price-section { background-color: #D9572B; color: #ffffff; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0; }
            .price { font-size: 32px; font-weight: bold; margin: 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #D9572B 0%, #F4A261 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; margin: 24px 0; }
            .footer { background-color: #2C3E50; color: #ffffff; padding: 30px; text-align: center; }
            .footer-text { margin: 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">KoboClass</div>
              <p class="header-text">Your class ticket is confirmed! 🎉</p>
            </div>
            
            <div class="content">
              <h2>Hi ${data.userName}!</h2>
              <p>Thank you for purchasing a ticket to this amazing class. We're excited to have you join us!</p>
              
              <div class="class-card">
                <h3 class="class-title">${data.className}</h3>
                <p class="host-name">with ${data.hostName}</p>
                
                <div class="class-details">
                  <div class="detail-item">
                    <span>📅</span>
                    <span>${data.classDate}</span>
                  </div>
                  <div class="detail-item">
                    <span>🕐</span>
                    <span>${data.classTime}</span>
                  </div>
                  <div class="detail-item">
                    <span>⏱️</span>
                    <span>${data.duration}</span>
                  </div>
                </div>
              </div>
              
              <div class="price-section">
                <p class="price">${data.price}</p>
                <p style="margin: 0; font-size: 14px;">Payment Confirmed</p>
              </div>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>We'll send you reminders before the class starts</li>
                <li>Join the live session from your dashboard</li>
                <li>Bring your questions and get ready to learn!</li>
              </ul>
              
              <a href="${process.env.FRONTEND_URL || 'https://koboclass.com'}/dashboard" class="cta-button">
                View My Classes
              </a>
              
              <p style="margin-top: 32px; font-size: 14px; color: #7F8C8D;">
                Ticket ID: ${data.ticketId}
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                © 2024 KoboClass. Made with ❤️ for Nigerian creatives.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await resend.emails.send({
      from: 'KoboClass <noreply@koboclass.com>',
      to: emailTemplate.to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending purchase confirmation email:', error);
    return { success: false, error: 'Failed to send confirmation email' };
  }
};

// Send class reminder email
export const sendClassReminderEmail = async (data: ClassReminderEmailData) => {
  try {
    const reminderMessages = {
      '24h': {
        subject: `⏰ Reminder: ${data.className} starts tomorrow`,
        title: 'Your class starts tomorrow!',
        message: 'Don\'t forget about your upcoming class tomorrow. Get ready to learn something amazing!',
        urgency: 'tomorrow'
      },
      '1h': {
        subject: `🚨 Starting Soon: ${data.className} in 1 hour`,
        title: 'Your class starts in 1 hour!',
        message: 'Your class is starting very soon. Make sure you\'re ready to join!',
        urgency: 'in 1 hour'
      },
      'starting': {
        subject: `🔴 LIVE NOW: ${data.className} is starting`,
        title: 'Your class is starting now!',
        message: 'Your class is starting right now. Click the button below to join immediately!',
        urgency: 'right now'
      }
    };

    const reminder = reminderMessages[data.reminderType];

    const emailTemplate: EmailTemplate = {
      to: data.userEmail,
      subject: reminder.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Class Reminder</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f6f3; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #D9572B 0%, #F4A261 100%); padding: 40px 30px; text-align: center; }
            .logo { color: #ffffff; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: #ffffff; font-size: 18px; margin: 0; }
            .content { padding: 40px 30px; }
            .class-card { background-color: #f8f6f3; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .class-title { font-size: 24px; font-weight: bold; color: #2C3E50; margin: 0 0 8px 0; }
            .host-name { color: #7F8C8D; font-size: 16px; margin: 0 0 16px 0; }
            .class-details { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; }
            .detail-item { display: flex; align-items: center; gap: 8px; color: #2C3E50; }
            .urgency-banner { background-color: ${data.reminderType === 'starting' ? '#e74c3c' : data.reminderType === '1h' ? '#f39c12' : '#27ae60'}; color: #ffffff; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0; font-weight: bold; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #D9572B 0%, #F4A261 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; margin: 24px 0; font-size: 18px; }
            .footer { background-color: #2C3E50; color: #ffffff; padding: 30px; text-align: center; }
            .footer-text { margin: 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">KoboClass</div>
              <p class="header-text">${reminder.title}</p>
            </div>
            
            <div class="content">
              <h2>Hi ${data.userName}!</h2>
              <p>${reminder.message}</p>
              
              <div class="urgency-banner">
                Class starts ${reminder.urgency}
              </div>
              
              <div class="class-card">
                <h3 class="class-title">${data.className}</h3>
                <p class="host-name">with ${data.hostName}</p>
                
                <div class="class-details">
                  <div class="detail-item">
                    <span>📅</span>
                    <span>${data.classDate}</span>
                  </div>
                  <div class="detail-item">
                    <span>🕐</span>
                    <span>${data.classTime}</span>
                  </div>
                  <div class="detail-item">
                    <span>⏱️</span>
                    <span>${data.duration}</span>
                  </div>
                </div>
              </div>
              
              ${data.reminderType === 'starting' ? 
                `<a href="${data.joinUrl}" class="cta-button">
                  🔴 Join Live Class Now
                </a>` :
                `<a href="${process.env.FRONTEND_URL || 'https://koboclass.com'}/dashboard" class="cta-button">
                  View My Classes
                </a>`
              }
              
              <p style="margin-top: 32px; font-size: 14px; color: #7F8C8D;">
                Make sure you have a stable internet connection and are in a quiet environment for the best learning experience.
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                © 2024 KoboClass. Made with ❤️ for Nigerian creatives.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await resend.emails.send({
      from: 'KoboClass <noreply@koboclass.com>',
      to: emailTemplate.to,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending class reminder email:', error);
    return { success: false, error: 'Failed to send reminder email' };
  }
};

// Schedule email reminders for a class (this would typically be called by a background job)
export const scheduleClassReminders = async (ticketData: any) => {
  try {
    const classDateTime = new Date(ticketData.classes.date_time);
    const now = new Date();
    
    // Calculate reminder times
    const twentyFourHoursBefore = new Date(classDateTime.getTime() - 24 * 60 * 60 * 1000);
    const oneHourBefore = new Date(classDateTime.getTime() - 60 * 60 * 1000);
    const classStartTime = classDateTime;
    
    const reminderData: ClassReminderEmailData = {
      userEmail: ticketData.user_email,
      userName: ticketData.user_name || 'Student',
      className: ticketData.classes.title,
      hostName: ticketData.classes.users?.full_name || 'Host',
      classDate: classDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      classTime: classDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      duration: `${ticketData.classes.duration_minutes} minutes`,
      joinUrl: `${process.env.FRONTEND_URL || 'https://koboclass.com'}/class/${ticketData.classes.id}/live`,
      reminderType: '24h'
    };
    
    // In a real implementation, you would use a job queue like Bull or a cron job service
    // For now, we'll return the reminder schedule information
    return {
      success: true,
      reminders: {
        twentyFourHour: twentyFourHoursBefore > now ? twentyFourHoursBefore : null,
        oneHour: oneHourBefore > now ? oneHourBefore : null,
        starting: classStartTime > now ? classStartTime : null
      },
      data: reminderData
    };
  } catch (error) {
    console.error('Error scheduling class reminders:', error);
    return { success: false, error: 'Failed to schedule reminders' };
  }
};

// Test email function (for development)
export const sendTestEmail = async (to: string) => {
  try {
    const result = await resend.emails.send({
      from: 'KoboClass <noreply@koboclass.com>',
      to,
      subject: 'KoboClass Email Test',
      html: `
        <h1>Email Test Successful! 🎉</h1>
        <p>If you're receiving this email, your Resend integration is working correctly.</p>
        <p>KoboClass is ready to send beautiful emails to your users.</p>
      `,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending test email:', error);
    return { success: false, error: 'Failed to send test email' };
  }
};

// backend/src/services/emailService.js

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email templates
const templates = {
  'print-request': {
    subject: 'New Print Request - ThePrintFarm',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🖨️ ThePrintFarm</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">New Print Request</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Hi {{makerName}}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            You have received a new print request from <strong>{{customerName}}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #333;">📦 Print Details</h3>
            <p><strong>Model:</strong> {{modelTitle}}</p>
            <p><strong>Quantity:</strong> {{quantity}}</p>
            <p><strong>Material:</strong> {{material}}</p>
            <p><strong>Color:</strong> {{color}}</p>
            <p><strong>Urgency:</strong> {{urgency}}</p>
            {{#if notes}}<p><strong>Notes:</strong> {{notes}}</p>{{/if}}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{modelUrl}}" style="display: inline-block; background: #28a745; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 0 10px 10px 0;">
              🔗 View Model
            </a>
            <a href="{{dashboardUrl}}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 0 10px 10px 0;">
              📋 View Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Log in to your ThePrintFarm dashboard to accept or decline this request.
          </p>
        </div>
        
        <div style="background: #343a40; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">© 2024 ThePrintFarm. All rights reserved.</p>
        </div>
      </div>
    `
  },

  'print-accepted': {
    subject: 'Print Request Accepted - ThePrintFarm',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🖨️ ThePrintFarm</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Request Accepted!</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Great news, {{customerName}}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            <strong>{{makerName}}</strong> has accepted your print request for <strong>{{modelTitle}}</strong>.
          </p>
          
          {{#if quotedPrice}}
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #333;">💰 Quote</h3>
            <p style="font-size: 18px; font-weight: bold; color: #28a745; margin: 0;">
              ${{quotedPrice}}
            </p>
          </div>
          {{/if}}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
              📋 View Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You can track the progress of your print in your dashboard and message the maker directly if you have any questions.
          </p>
        </div>
        
        <div style="background: #343a40; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">© 2024 ThePrintFarm. All rights reserved.</p>
        </div>
      </div>
    `
  },

  'print-completed': {
    subject: 'Your Print is Complete! - ThePrintFarm',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🖨️ ThePrintFarm</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Print Complete!</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">🎉 {{customerName}}, your print is ready!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            <strong>{{makerName}}</strong> has completed printing your <strong>{{modelTitle}}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0; color: #333;">📬 Next Steps</h3>
            <p>Contact the maker through our messaging system to arrange pickup or shipping.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
              📋 View Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Don't forget to leave a review for the maker to help other customers make informed decisions!
          </p>
        </div>
        
        <div style="background: #343a40; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">© 2024 ThePrintFarm. All rights reserved.</p>
        </div>
      </div>
    `
  },

  'welcome': {
    subject: 'Welcome to ThePrintFarm!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🖨️ ThePrintFarm</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Welcome to the Community!</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Welcome, {{userName}}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Thank you for joining ThePrintFarm, the community-driven 3D printing marketplace that connects makers with customers.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">🚀 Get Started</h3>
            {{#if isCustomer}}
            <ul style="color: #666; line-height: 1.6;">
              <li>Browse thousands of 3D models from Thingiverse</li>
              <li>Find skilled makers in your area</li>
              <li>Request prints and track progress</li>
              <li>Message makers directly</li>
            </ul>
            {{/if}}
            {{#if isMaker}}
            <ul style="color: #666; line-height: 1.6;">
              <li>Set up your printer capabilities and availability</li>
              <li>Receive print requests from customers</li>
              <li>Manage your print queue</li>
              <li>Build your reputation in the community</li>
            </ul>
            {{/if}}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboardUrl}}" style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px;">
              🏠 Go to Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #343a40; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">© 2024 ThePrintFarm. All rights reserved.</p>
        </div>
      </div>
    `
  }
};

// Simple template renderer (replaces {{variable}} with values)
function renderTemplate(template, data) {
  let rendered = template;
  
  // Replace simple variables
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, data[key] || '');
  });
  
  // Handle conditional blocks {{#if variable}}...{{/if}}
  rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
    return data[variable] ? content : '';
  });
  
  return rendered;
}

// Send email function
async function sendEmail({ to, subject, template, data = {} }) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Email would be sent to:', to);
      return { success: false, error: 'Email service not configured' };
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      throw new Error('SENDGRID_FROM_EMAIL environment variable is required');
    }

    let emailContent = { subject, html: '' };

    // Use template if provided
    if (template && templates[template]) {
      const templateData = templates[template];
      emailContent.subject = data.subject || renderTemplate(templateData.subject, data);
      emailContent.html = renderTemplate(templateData.html, data);
    }

    const msg = {
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: 'ThePrintFarm'
      },
      subject: emailContent.subject,
      html: emailContent.html
    };

    await sgMail.send(msg);
    
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Send bulk emails
async function sendBulkEmails(emails) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Bulk emails would be sent.');
      return { success: false, error: 'Email service not configured' };
    }

    const msgs = emails.map(email => ({
      to: email.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: 'ThePrintFarm'
      },
      subject: email.subject,
      html: email.html
    }));

    await sgMail.send(msgs);
    
    return { success: true, count: emails.length };
  } catch (error) {
    console.error('Bulk email send error:', error);
    return { success: false, error: error.message };
  }
}

// Email templates for different notifications
const emailTemplates = {
  printRequest: (data) => sendEmail({
    to: data.makerEmail,
    template: 'print-request',
    data
  }),

  printAccepted: (data) => sendEmail({
    to: data.customerEmail,
    template: 'print-accepted',
    data
  }),

  printCompleted: (data) => sendEmail({
    to: data.customerEmail,
    template: 'print-completed',
    data
  }),

  welcome: (data) => sendEmail({
    to: data.userEmail,
    template: 'welcome',
    data
  })
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  emailTemplates,
  templates
};
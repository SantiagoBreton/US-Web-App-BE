import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter!: nodemailer.Transporter;
  private fromEmail: string;
  private isMockMode: boolean = false;
  private useSendGridAPI: boolean = false;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@yourapp.com';
    this.createTransporter();
  }

  private createTransporter() {
    
    const emailService = process.env.EMAIL_SERVICE?.toLowerCase();

    switch (emailService) {
      case 'gmail':
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
          console.log('⚠️ Gmail credentials not configured, using mock email service');
          this.createMockTransporter();
          return;
        }
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, 
          auth: {
            user: process.env.EMAIL_USER!,
            pass: process.env.EMAIL_APP_PASSWORD!,
          },
          tls: {
            rejectUnauthorized: false // Allow self-signed certificates
          },
          connectionTimeout: 60000, // 60 seconds
          greetingTimeout: 30000, // 30 seconds
          socketTimeout: 60000, // 60 seconds
        });
        break;

      case 'sendgrid':
        if (!process.env.SENDGRID_API_KEY) {
          console.log('⚠️ SendGrid API key not configured, using mock email service');
          this.createMockTransporter();
          return;
        }
        
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.useSendGridAPI = true;
        console.log('✅ SendGrid API configured');
        break;

      case 'smtp':
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
          console.log('⚠️ SMTP credentials not configured, using mock email service');
          this.createMockTransporter();
          return;
        }
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST!,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASS!,
          },
        } as EmailConfig);
        break;

      default:
        console.log('⚠️ No email service configured, using mock email service');
        this.createMockTransporter();
        break;
    }
  }

  private createMockTransporter() {
    // Create a mock transporter for development
    this.isMockMode = true;
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      // Use SendGrid API if configured
      if (this.useSendGridAPI) {
        const msg = {
          to: options.to,
          from: this.fromEmail,
          subject: options.subject,
          text: options.text || '',
          html: options.html,
        };
        
        await sgMail.send(msg);
        console.log('✅ Email sent successfully via SendGrid API');
        return;
      }

      // Otherwise use nodemailer (SMTP or mock)
      const mailOptions = {
        from: `"US" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Check if this is mock mode (development)
      if (this.isMockMode) {
        console.log('\n📧 MOCK EMAIL SENT:');
        console.log('=====================================');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log('-------------------------------------');
        if (options.text) {
          console.log('Text Content:');
          console.log(options.text);
        }
        console.log('=====================================\n');
      } else {
        console.log('✅ Email sent successfully:', result.messageId);
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = this.getPasswordResetEmailTemplate(userName, resetUrl);
    const text = this.getPasswordResetEmailText(userName, resetUrl);

    await this.sendEmail({
      to: email,
      subject: 'Recuperación de Contraseña - US',
      html,
      text,
    });
  }

  async sendReservationConfirmationEmail(
    email: string, 
    userName: string, 
    amenityName: string,
    startTime: Date,
    endTime: Date
  ): Promise<void> {
    const html = this.getReservationConfirmationTemplate(userName, amenityName, startTime, endTime);
    const text = this.getReservationConfirmationText(userName, amenityName, startTime, endTime);

    await this.sendEmail({
      to: email,
      subject: `Reserva Confirmada: ${amenityName}`,
      html,
      text,
    });
  }

  async sendReservationCancellationEmail(
    email: string,
    userName: string,
    amenityName: string,
    startTime: Date,
    endTime: Date,
    reason?: string
  ): Promise<void> {
    const html = this.getReservationCancellationTemplate(userName, amenityName, startTime, endTime, reason);
    const text = this.getReservationCancellationText(userName, amenityName, startTime, endTime, reason);

    await this.sendEmail({
      to: email,
      subject: `Reserva Cancelada: ${amenityName}`,
      html,
      text,
    });
  }

  async sendReservationModificationEmail(
    email: string,
    userName: string,
    amenityName: string,
    oldStartTime: Date,
    oldEndTime: Date,
    newStartTime: Date,
    newEndTime: Date
  ): Promise<void> {
    const html = this.getReservationModificationTemplate(
      userName, amenityName, oldStartTime, oldEndTime, newStartTime, newEndTime
    );
    const text = this.getReservationModificationText(
      userName, amenityName, oldStartTime, oldEndTime, newStartTime, newEndTime
    );

    await this.sendEmail({
      to: email,
      subject: `Reserva Modificada: ${amenityName}`,
      html,
      text,
    });
  }

  private getPasswordResetEmailTemplate(userName: string, resetUrl: string): string {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .title {
                color: #2c3e50;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #3498db;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
            }
            .button:hover {
                background-color: #2980b9;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
            .link-fallback {
                word-break: break-all;
                color: #3498db;
                margin-top: 10px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔐 US</div>
            </div>
            
            <h1 class="title">Recuperación de Contraseña</h1>
            
            <div class="content">
                <p>Hola ${userName},</p>
                
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si no solicitaste este cambio, puedes ignorar este correo electrónico.</p>
                
                <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong>
                    <ul>
                        <li>Este enlace expirará en 1 hora por seguridad</li>
                        <li>Solo puedes usar este enlace una vez</li>
                        <li>Si no funciona el botón, copia y pega el enlace de abajo en tu navegador</li>
                    </ul>
                </div>
                
                <div class="link-fallback">
                    <strong>Enlace alternativo:</strong><br>
                    ${resetUrl}
                </div>
            </div>
            
            <div class="footer">
                <p>Si no solicitaste este cambio de contraseña, por favor ignora este correo o contacta con nuestro soporte.</p>
                <p><strong>US Team</strong></p>
                <p style="font-size: 12px; color: #999;">
                    Este es un correo automático, por favor no respondas a esta dirección.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getPasswordResetEmailText(userName: string, resetUrl: string): string {
    return `
Recuperación de Contraseña - US

Hola ${userName},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetUrl}

IMPORTANTE:
- Este enlace expirará en 1 hora por seguridad
- Solo puedes usar este enlace una vez
- Si no solicitaste este cambio, puedes ignorar este correo

Si tienes problemas con el enlace, cópialo y pégalo en tu navegador.

US Team

---
Este es un correo automático, por favor no respondas a esta dirección.
    `;
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(date);
  }

  private getReservationConfirmationTemplate(
    userName: string,
    amenityName: string,
    startTime: Date,
    endTime: Date
  ): string {
    const startFormatted = this.formatDateTime(startTime);
    const endFormatted = new Intl.DateTimeFormat('es-AR', {
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(endTime);

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Confirmada</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 10px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: white;
                margin-bottom: 10px;
            }
            .title {
                color: #2c3e50;
                margin-bottom: 20px;
            }
            .success-badge {
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #155724;
                text-align: center;
                font-weight: bold;
                font-size: 18px;
            }
            .reservation-details {
                background-color: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 20px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #dee2e6;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                font-weight: bold;
                color: #666;
            }
            .detail-value {
                color: #333;
                text-align: right;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
            .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">✅ US</div>
            </div>
            
            <div class="success-badge">
                ¡Reserva Confirmada!
            </div>
            
            <p>Hola ${userName},</p>
            
            <p>Tu reserva ha sido confirmada exitosamente. Aquí están los detalles:</p>
            
            <div class="reservation-details">
                <div class="detail-row">
                    <span class="detail-label">🏢 Amenity:</span>
                    <span class="detail-value">${amenityName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📅 Inicio:</span>
                    <span class="detail-value">${startFormatted}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">⏰ Finaliza:</span>
                    <span class="detail-value">${endFormatted}</span>
                </div>
            </div>
            
            <p><strong>Recordatorio:</strong> Por favor, llega a tiempo y recuerda que puedes cancelar tu reserva desde la aplicación si es necesario.</p>
            <a class="button" href="https://us-web-app-fe.onrender.com">Ver Mis Reservas</a>
            <div class="footer">
                <p><strong>US Team</strong></p>
                <p style="font-size: 12px; color: #999;">
                    Este es un correo automático, por favor no respondas a esta dirección.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getReservationConfirmationText(
    userName: string,
    amenityName: string,
    startTime: Date,
    endTime: Date
  ): string {
    const startFormatted = this.formatDateTime(startTime);
    const endFormatted = new Intl.DateTimeFormat('es-AR', {
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(endTime);

    return `
¡Reserva Confirmada! - US

Hola ${userName},

Tu reserva ha sido confirmada exitosamente.

DETALLES DE LA RESERVA:
- Amenity: ${amenityName}
- Inicio: ${startFormatted}
- Finaliza: ${endFormatted}

RECORDATORIO:
Por favor, llega a tiempo y recuerda que puedes cancelar tu reserva desde la aplicación si es necesario.

US Team

---
Este es un correo automático, por favor no respondas a esta dirección.
    `;
  }

  private getReservationCancellationTemplate(
    userName: string,
    amenityName: string,
    startTime: Date,
    endTime: Date,
    reason?: string
  ): string {
    const startFormatted = this.formatDateTime(startTime);
    const endFormatted = new Intl.DateTimeFormat('es-AR', {
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(endTime);

    const reasonSection = reason ? `
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; font-weight: bold; color: #856404;">📋 Motivo de la cancelación:</p>
                <p style="margin: 10px 0 0 0; color: #856404;">${reason}</p>
            </div>
    ` : '';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Cancelada</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                border-radius: 10px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: white;
                margin-bottom: 10px;
            }
            .cancelled-badge {
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #721c24;
                text-align: center;
                font-weight: bold;
                font-size: 18px;
            }
            .reservation-details {
                background-color: #f8f9fa;
                border-left: 4px solid #f5576c;
                padding: 20px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #dee2e6;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                font-weight: bold;
                color: #666;
            }
            .detail-value {
                color: #333;
                text-align: right;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">❌ US</div>
            </div>
            
            <div class="cancelled-badge">
                Reserva Cancelada
            </div>
            
            <p>Hola ${userName},</p>
            
            <p>Tu reserva ha sido cancelada. Aquí están los detalles de la reserva cancelada:</p>
            
            ${reasonSection}
            
            <div class="reservation-details">
                <div class="detail-row">
                    <span class="detail-label">🏢 Amenity:</span>
                    <span class="detail-value">${amenityName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">📅 Era para:</span>
                    <span class="detail-value">${startFormatted}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">⏰ Hasta:</span>
                    <span class="detail-value">${endFormatted}</span>
                </div>
            </div>
            
            <p>Puedes hacer una nueva reserva en cualquier momento desde la aplicación.</p>
            
            <div class="footer">
                <p><strong>US Team</strong></p>
                <p style="font-size: 12px; color: #999;">
                    Este es un correo automático, por favor no respondas a esta dirección.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getReservationCancellationText(
    userName: string,
    amenityName: string,
    startTime: Date,
    endTime: Date,
    reason?: string
  ): string {
    const startFormatted = this.formatDateTime(startTime);
    const endFormatted = new Intl.DateTimeFormat('es-AR', {
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(endTime);

    const reasonText = reason ? `\nMOTIVO DE LA CANCELACIÓN:\n${reason}\n` : '';

    return `
Reserva Cancelada - US

Hola ${userName},

Tu reserva ha sido cancelada.
${reasonText}
DETALLES DE LA RESERVA CANCELADA:
- Amenity: ${amenityName}
- Era para: ${startFormatted}
- Hasta: ${endFormatted}

Puedes hacer una nueva reserva en cualquier momento desde la aplicación.

US Team

---
Este es un correo automático, por favor no respondas a esta dirección.
    `;
  }

  private getReservationModificationTemplate(
    userName: string,
    amenityName: string,
    oldStartTime: Date,
    oldEndTime: Date,
    newStartTime: Date,
    newEndTime: Date
  ): string {
    const oldStartFormatted = this.formatDateTime(oldStartTime);
    const oldEndFormatted = new Intl.DateTimeFormat('es-AR', {
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(oldEndTime);
    const newStartFormatted = this.formatDateTime(newStartTime);
    const newEndFormatted = new Intl.DateTimeFormat('es-AR', {
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(newEndTime);

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Modificada</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
                border-radius: 10px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: white;
                margin-bottom: 10px;
            }
            .modified-badge {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
                text-align: center;
                font-weight: bold;
                font-size: 18px;
            }
            .reservation-details {
                background-color: #f8f9fa;
                border-left: 4px solid #fee140;
                padding: 20px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .comparison {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
            }
            .old-details, .new-details {
                padding: 15px;
                border-radius: 5px;
            }
            .old-details {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
            }
            .new-details {
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
            }
            .section-title {
                font-weight: bold;
                margin-bottom: 10px;
                text-align: center;
            }
            .detail-item {
                padding: 5px 0;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔄 US</div>
            </div>
            
            <div class="modified-badge">
                Reserva Modificada
            </div>
            
            <p>Hola ${userName},</p>
            
            <p>Tu reserva para <strong>${amenityName}</strong> ha sido modificada:</p>
            
            <div class="comparison">
                <div class="old-details">
                    <div class="section-title">❌ Horario Anterior</div>
                    <div class="detail-item">📅 ${oldStartFormatted}</div>
                    <div class="detail-item">⏰ ${oldEndFormatted}</div>
                </div>
                <div class="new-details">
                    <div class="section-title">✅ Nuevo Horario</div>
                    <div class="detail-item">📅 ${newStartFormatted}</div>
                    <div class="detail-item">⏰ ${newEndFormatted}</div>
                </div>
            </div>
            
            <p><strong>Recordatorio:</strong> Por favor, verifica el nuevo horario y asegúrate de llegar a tiempo.</p>
            
            <div class="footer">
                <p><strong>US Team</strong></p>
                <p style="font-size: 12px; color: #999;">
                    Este es un correo automático, por favor no respondas a esta dirección.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private getReservationModificationText(
    userName: string,
    amenityName: string,
    oldStartTime: Date,
    oldEndTime: Date,
    newStartTime: Date,
    newEndTime: Date
  ): string {
    const oldStartFormatted = this.formatDateTime(oldStartTime);
    const oldEndFormatted = new Intl.DateTimeFormat('es-AR', {
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(oldEndTime);
    const newStartFormatted = this.formatDateTime(newStartTime);
    const newEndFormatted = new Intl.DateTimeFormat('es-AR', {
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(newEndTime);

    return `
Reserva Modificada - US

Hola ${userName},

Tu reserva para ${amenityName} ha sido modificada.

HORARIO ANTERIOR:
- Inicio: ${oldStartFormatted}
- Fin: ${oldEndFormatted}

NUEVO HORARIO:
- Inicio: ${newStartFormatted}
- Fin: ${newEndFormatted}

RECORDATORIO:
Por favor, verifica el nuevo horario y asegúrate de llegar a tiempo.

US Team

---
Este es un correo automático, por favor no respondas a esta dirección.
    `;
  }

  // Test email connectivity
  async testConnection(): Promise<boolean> {
    try {
      if (this.isMockMode) {
        console.log('📧 Email service running in mock mode (development)');
        return true;
      }

      if (this.useSendGridAPI) {
        console.log('✅ SendGrid API ready (no connection test needed)');
        return true;
      }
      
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      console.warn('⚠️ Email service connection failed - check your configuration');
      return false;
    }
  }
}

export const emailService = new EmailService();
import nodemailer from 'nodemailer';

// SMTP credentials from .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// For dev, mailtrap.io or Gmail app-password work fine.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
});

const from = process.env.MAIL_FROM || 'MealMate <no-reply@mealmate.app>';

export const sendMail = async ({ to, subject, html }) => {
    if (!process.env.SMTP_HOST) {
        console.warn('[mailer] SMTP not configured — skipping email:', subject);
        return false;
    }
    await transporter.sendMail({ from, to, subject, html });
    return true;
};

const resetTemplate = (name, resetUrl) => `
  <h2>MealMate — Password Reset</h2>
  <p>Hi ${name || 'there'},</p>
  <p>You requested a password reset. Click the link below (valid for 15 minutes):</p>
  <p><a href="${resetUrl}">Reset your password</a></p>
  <p>If you didn't request this, you can safely ignore this email.</p>`;

const verifyTemplate = (name, verifyUrl) => `
  <h2>MealMate — Verify your email</h2>
  <p>Hi ${name || 'there'},</p>
  <p>Please confirm your email address:</p>
  <p><a href="${verifyUrl}">Verify my email</a></p>`;

const inviteTemplate = (groupName, inviterName, joinUrl) => `
  <h2>You've been invited to "${groupName}" on MealMate</h2>
  <p>${inviterName} invited you to join their mess group.</p>
  <p><a href="${joinUrl}">Join the group</a></p>`;

export const sendPasswordResetEmail = (user, token) =>
    sendMail({
        to: user.email,
        subject: 'MealMate — Reset your password',
        html: resetTemplate(user.username, `${process.env.FRONTEND_URL}/reset-password?token=${token}`),
    });

export const sendVerificationEmail = (user, token) =>
    sendMail({
        to: user.email,
        subject: 'MealMate — Verify your email',
        html: verifyTemplate(user.username, `${process.env.FRONTEND_URL}/verify-email?token=${token}`),
    });

export const sendGroupInviteEmail = (email, groupName, inviterName, code) =>
    sendMail({
        to: email,
        subject: `MealMate — Invitation to join "${groupName}"`,
        html: inviteTemplate(groupName, inviterName, `${process.env.FRONTEND_URL}/join?code=${code}`),
    });

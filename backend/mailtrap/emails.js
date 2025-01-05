import { VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplates.js"
import { mailtrapClient, sender } from "./mailtrapConfig.js"

export const SendVerificationEmail = async(email, verificationToken ) => {
    const recipient = [{email}] 

    try {
        const response = await mailtrapClient.send({
            from:sender,
            to:recipient,
            subject:"Verify your Email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
            category: "Email Verification"
        })
        console.log("Verification Email sent successfully", response);

    } catch (error) {
        console.error(`Error sending verification email`, error);
        throw new Error(`Error sending verification email: ${error.message}`)
    }
}
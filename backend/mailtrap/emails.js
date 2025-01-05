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

export const SendWelcomeEmail = async(email, name) => {
        const recipient = [{email}]

        try {
            const response = await mailtrapClient.send({
                from:sender,
                to:recipient,
                template_uuid: "a7d59137-e1cc-4d41-a957-421a815810a4",
                template_variables: {
                    company_info_name: "Node.JS AUTH",
                    name: name
                }
            })

            console.log("Welcome Email sent successfully", response);
        } catch (error) {
            throw new Error(`Error sending welcome email: ${error.message}`)
        }
}
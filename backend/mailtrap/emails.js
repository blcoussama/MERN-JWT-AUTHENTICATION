import { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplates.js"
import { mailtrapClient, sender } from "./mailtrapConfig.js"

export const SendVerificationEmail = async(email, verificationToken ) => {
    const recipient = [{ email }] 

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
        const recipient = [{ email }]

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

export const SendPasswordResetEmail = async(email, resetURL) => {
    const recipient = [{ email }]

        try {
            const response = await mailtrapClient.send({
                from:sender,
                to:recipient,
                subject:"Reset Your Password",
                html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
                category: "Password Reset"
            })
            console.log("Password Reset email sent Successfully", response);

        } catch (error) {
            console.error(`Error Sending the Password reset email!`, error);
            throw new Error(`Error Sending the Password reset email: ${error.message}`)
        }
}

export const SendPasswordResetSuccessEmail = async(email) => {
    const recipient = [{ email}]

    try {
        const response = await mailtrapClient.send({
            from:sender,
            to:recipient,
            subject:"Password Reset Successfully!",
            html: PASSWORD_RESET_SUCCESS_TEMPLATE,
            category: "Password Reset Success"
        })
        console.log("Password Reset Success email sent successfully.", response);

    } catch (error) {
        console.error(`Error Sending the Password success reset email!`, error);
        throw new Error(`Error Sending the Password success reset email: ${error.message}`)
    }
}
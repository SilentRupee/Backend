import nodemailer from 'nodemailer';
import otp from "otp-generator"

export const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
 
export const  generaotp=async(req:any,res:any)=>{
    req.app.locals.OTP= otp.generate(6,{upperCaseAlphabets:false,specialChars:false,lowerCaseAlphabets:false,digits:true});
   console.log(req.app.locals.OTP)
const {name,email}=req.body
console.log(email);

const verifyotp={
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: 'Silent Rupee - Account Verification OTP',
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 25px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #3b82f6; font-size: 24px; font-weight: 600;">Welcome to Solara</h1>
            </div>
            
            <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); border-radius: 6px; padding: 20px; margin-bottom: 25px;">
                <h2 style="color: white; font-size: 20px; text-align: center; margin: 0;">Your Verification Code</h2>
              </div>
              
              <div style="text-align: center; margin: 25px 0;">
                <div style="display: inline-block; background-color: #f3f4f6; padding: 15px 30px; border-radius: 6px; border: 1px dashed #d1d5db;">
                  <span style="font-size: 28px; font-weight: 600; color: #3b82f6; letter-spacing: 2px;">${req.app.locals.OTP}</span>
                </div>
              </div>
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin-bottom: 15px;">
                Hello ${name},
              </p>
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin-bottom: 15px;">
                Thank you for signing up with Solara! To complete your account verification, please enter the following one-time password (OTP) in the app:
              </p>
              
              <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin-bottom: 25px;">
                This code will expire in 10 minutes. If you didn't request this code, please ignore this email or contact support if you have concerns.
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
                <p style="color: #6b7280; font-size: 13px; text-align: center;">
                  Need help? Contact our support team at <a href="mailto:support@solara.app" style="color: #3b82f6; text-decoration: none;">support@solara.app</a>
                </p>
              </div>
            </div>
            
            <div style="margin-top: 25px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Solara App. All rights reserved.
              </p>
            </div>
          </div>
        `
      
};
;
// console.log(reason);

    try{transporter.sendMail(verifyotp,(err)=>{
        if(err){
            res.send(err);
        }
        else{
            return res.status(200).send({message:"OTP Sent"});
        }
    })
}catch(error){
    console.log(error);
    }
}

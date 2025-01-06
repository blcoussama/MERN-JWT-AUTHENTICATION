import { motion } from 'framer-motion'
import FormInput from '../components/FormInput'
import { User, Mail, Lock} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PasswordStrengthMeter from '../components/PasswordStrengthMeter'

const SignUp = () => {

    const handleSignUp = (event) => {
        event.preventDefault()
    }

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    return (
        <motion.div
            initial={{opacity:0, y:20}}
            animate={{opacity:1, y:0}}
            transition={{duration:0.5}}
            className="max-w-md w-full bg-gray-900 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden"
        >
            <div className="p-8">
                <h2 className='text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to emrald-500 text-transparent bg-clip-text'>
                    Create an Account
                </h2>

                <form onSubmit={handleSignUp}>

                    <FormInput icon={User} 
                    type="text" 
                    placeholder="Full Name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)} />

                    <FormInput icon={Mail} 
                    type="email" 
                    placeholder="Email Address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} />

                    <FormInput icon={Lock} 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} />
                    {/* PASSWORD STRENGTH METER */}
                    <PasswordStrengthMeter password={password} />
                    <motion.button 
                        className="mt-5 w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 
						text-white font-bold rounded-lg shadow-lg hover:from-green-600
						hover:to-emerald-700 focus:outline-none focus:ring-1 focus:ring-green-500 focus:ring-offset-2
                        focus:ring-offset-gray-900 transition duration-200"
                        whileHover={{ scale: 1.02}}
                        whileTap={{ scale: 0.98}}
                        type='submit'
                    >
                        SignUp       
                    </motion.button>
                </form>
            </div>

            <div className='px-8 py-4 bg-gray-900 bg-opacity-50 flex justify-center'>
                <p className='text-sm text-gray-400'>
                    Already Have an Account?{" "}
                    <Link to={"/login"} className='text-base text-green-400 hover:underline ml-2'>Login</Link>
                </p>
            </div>
        </motion.div>
    )
}

export default SignUp
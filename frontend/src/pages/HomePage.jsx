import { Link } from "react-router-dom";


const HomePage = () => {

	return (
		<div className="flex gap-24">
			<Link to={"/admin-dashboard"}>
				<div  className='text-center flex items-center justify-center w-60 h-60 p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 text-lg text-white font-bold'>Im a Admin</div>
			</Link>
			
			<Link to={"/client-dashboard"}>
				<div className="text-center flex items-center justify-center w-60 h-60 p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 text-lg text-white font-bold">Im a Client</div>
			</Link>
			
		</div>
	);
}

export default HomePage
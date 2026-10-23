import { useEffect, useState } from 'react';
import ProfileCard, { Card } from '../components/ProfileCard';
import axiosInstance from '../utils/axiosInstance';
import { FormatDate } from '../utils/Date';

/** Admin dashboard: profile + the list of accounts, served by GET /api/users (admin role checked by the API). */
const AdminDashboard = () => {
    const [data, setData] = useState({ status: 'loading', users: [], total: 0 });

    useEffect(() => {
        let cancelled = false;
        axiosInstance
            .get('/users')
            .then(({ data: body }) => !cancelled && setData({ status: 'ready', users: body.users, total: body.total }))
            .catch((error) => !cancelled && setData({ status: error.response?.data?.message ?? 'Could not load the users.', users: [], total: 0 }));
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="max-w-3xl w-full py-10">
            <ProfileCard title="Admin Dashboard">
                <Card title={`Users${data.status === 'ready' ? ` (${data.total})` : ''}`} delay={0.5}>
                    {data.status === 'loading' && <p className="text-gray-400">Loading...</p>}
                    {data.status !== 'loading' && data.status !== 'ready' && <p className="text-red-500">{data.status}</p>}
                    {data.status === 'ready' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="text-gray-400 border-b border-gray-700">
                                    <tr>
                                        <th className="py-2 pr-3">Name</th>
                                        <th className="py-2 pr-3">Email</th>
                                        <th className="py-2 pr-3">Role</th>
                                        <th className="py-2 pr-3">Verified</th>
                                        <th className="py-2">Last login</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.users.map((u) => (
                                        <tr key={u.id} className="border-b border-gray-800 last:border-0">
                                            <td className="py-2 pr-3">{u.username}</td>
                                            <td className="py-2 pr-3">{u.email}</td>
                                            <td className="py-2 pr-3">{u.role}</td>
                                            <td className="py-2 pr-3">{u.isVerified ? 'Yes' : 'No'}</td>
                                            <td className="py-2">{u.lastLogin ? FormatDate(u.lastLogin) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </ProfileCard>
        </div>
    );
};

export default AdminDashboard;

'use client';

import React, { useEffect, useState } from 'react';

export default function DebugEnvCheck() {
    const [envVar, setEnvVar] = useState<string | undefined>('loading...');

    useEffect(() => {
        setEnvVar(process.env.NEXT_PUBLIC_BACKEND_URL);
    }, []);

    return (
        <div className="p-8 text-white bg-gray-900 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Environment Check</h1>
            <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded border border-gray-700">
                    <h2 className="text-lg font-semibold text-blue-400">NEXT_PUBLIC_BACKEND_URL</h2>
                    <p className="font-mono mt-2 text-green-400">
                        {envVar === undefined ? 'undefined' : envVar === '' ? '(empty string)' : envVar}
                    </p>
                </div>
                <div className="p-4 bg-gray-800 rounded border border-gray-700">
                    <h2 className="text-lg font-semibold text-blue-400">Server Status</h2>
                    <p className="text-green-400">If you can see this, the server is compiling new routes correctly.</p>
                </div>
            </div>
        </div>
    );
}

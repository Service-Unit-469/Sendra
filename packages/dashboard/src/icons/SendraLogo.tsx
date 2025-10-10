export default function SendraLogo({ width = 480, height = 160 }: { width?: number | string, height?: number | string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 480 160" role="img" aria-labelledby="sendraTitle">
            <title id="sendraTitle">Sendra Logo</title>
            <defs>
                <linearGradient id="sendraGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#4F8CF5" />
                    <stop offset="100%" stopColor="#2EC4B6" />
                </linearGradient>
            </defs>
            <g transform="translate(40,30 ) scale(1.05)">
                <path d="M0 20 L110 55 L60 70 L25 95 L20 60 Z" fill="url(#sendraGradient)" />
                <path d="M0 20 L60 70" stroke="#ffffff" strokeWidth="2" opacity="0.6" />
            </g>
            <g transform="translate(180,108)" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">
                <text x="0" y="0" fontSize="64" fill="#0f1724" fontWeight="700" style={{ letterSpacing: "-1px" }}>Sendra</text>
            </g>
        </svg>
    );
}
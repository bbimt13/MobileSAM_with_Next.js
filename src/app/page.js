import Link from 'next/link'

export default function Home() {
    return (
        <div>

            <h1>테스트</h1>
            <p>테스트</p>
            <Link href="/mobilesam">
            <p>Go to Annotation Page</p>
            </Link>
            <Link href="/tool">
            <p>Go to tool Page</p>
            </Link>
        </div>
    )
}
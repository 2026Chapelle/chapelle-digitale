import GroupSpace from '@/components/community/GroupSpace'

export const dynamic = 'force-dynamic'

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return (
        <div className="min-h-screen pt-24 pb-16 text-pearl">
            <div className="container-royal">
                <GroupSpace key={id} groupId={id} />
            </div>
        </div>
    )
}
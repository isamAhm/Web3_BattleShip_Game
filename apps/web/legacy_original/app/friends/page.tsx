'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { useWallet } from '@/providers/WalletContext';
import { useGame } from '@/providers/GameContext';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { UserPlus, Check, X, Swords, Trash2, Mail, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FriendsPage() {
  const router = useRouter();
  const { address, isAuthenticated } = useWallet();
  const { joinPrivateRoom } = useGame();

  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [targetAddress, setTargetAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const fetchData = async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [friendsData, invitesData] = await Promise.all([
        api.social.getFriends().catch(() => ({ friends: [], pending: [] })),
        api.social.getInvites().catch(() => []),
      ]);
      setFriends(friendsData?.friends || []);
      setPending(friendsData?.pending || []);
      setInvites(invitesData || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [address]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAddress.trim()) return;
    setActionMsg(null);
    try {
      await api.social.sendFriendRequest(targetAddress.trim());
      setActionMsg({ type: 'success', text: 'Friend transmission dispatched successfully.' });
      setTargetAddress('');
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to send friend request.' });
    }
  };

  const handleRespondRequest = async (id: string, action: 'accept' | 'reject') => {
    try {
      await api.social.respondFriendRequest(id, action);
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to respond to request.' });
    }
  };

  const handleRemoveFriend = async (friendAddress: string) => {
    try {
      await api.social.removeFriend(friendAddress);
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to remove friend.' });
    }
  };

  const handleAcceptInvite = async (inviteId: string, roomCode: string) => {
    try {
      await api.social.respondInvite(inviteId, 'accept');
      await joinPrivateRoom(roomCode);
      router.push('/play');
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to join skirmish invite.' });
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-arena-border/50 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wider">
              SQUAD COMMS & ALLIES
            </h1>
            <Badge variant="cyan" size="sm">
              TACTICAL ALLIANCES
            </Badge>
          </div>
          <p className="text-xs text-arena-textSub mt-1">
            Manage ally friendships, skirmish invitations, and tactical squad links.
          </p>
        </div>

        {isAuthenticated && (
          <Button size="sm" variant="secondary" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {actionMsg && (
        <div
          className={`p-3 rounded-lg text-xs ${
            actionMsg.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
              : 'bg-arena-red/15 border border-arena-red/30 text-arena-redBright'
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* Grid: Friends list on Left, Send Request & Invites on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Friends & Pending */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Invitations Banner */}
          {invites.length > 0 && (
            <Card className="p-4 border-arena-amber/50 bg-arena-amber/5" glow="amber">
              <div className="flex items-center gap-2 text-xs font-bold text-arena-amber uppercase tracking-wider mb-2">
                <Mail className="w-4 h-4" />
                <span>Pending Skirmish Invitations ({invites.length})</span>
              </div>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv._id || inv.id}
                    className="flex items-center justify-between p-2.5 rounded bg-arena-surface/80 border border-arena-border/50 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">
                        Commander {inv.sender?.slice(0, 8)}...
                      </span>
                      <span className="text-arena-textMuted ml-1.5">
                        invited you to room{' '}
                        <span className="font-mono text-arena-cyan">{inv.roomCode}</span>
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="cyan"
                      onClick={() => handleAcceptInvite(inv._id || inv.id, inv.roomCode)}
                    >
                      <Swords className="w-3.5 h-3.5 mr-1" /> Join Battle
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pending Incoming Friend Requests */}
          {pending.length > 0 && (
            <Card className="p-4 border-arena-cyan/40 bg-arena-cyan/5">
              <span className="text-xs font-bold text-arena-cyan uppercase tracking-wider font-mono">
                Incoming Friend Requests ({pending.length})
              </span>
              <div className="space-y-2 mt-3">
                {pending.map((req) => (
                  <div
                    key={req._id || req.id}
                    className="flex items-center justify-between p-2.5 rounded bg-arena-surface border border-arena-border text-xs"
                  >
                    <span className="font-mono text-white">
                      {req.requester?.username || req.requester?.address || 'Commander'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="cyan"
                        className="px-2 py-1 text-xs"
                        onClick={() => handleRespondRequest(req._id || req.id, 'accept')}
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2 py-1 text-xs text-arena-red"
                        onClick={() => handleRespondRequest(req._id || req.id, 'reject')}
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Established Friends List */}
          <Card className="border-arena-border overflow-hidden">
            <div className="p-4 border-b border-arena-border/60 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Allied Commanders ({friends.length})
              </span>
            </div>

            <div className="divide-y divide-arena-border/40">
              {!isAuthenticated ? (
                <div className="p-12 text-center text-arena-textMuted text-xs">
                  Connect wallet to view your tactical ally list.
                </div>
              ) : friends.length === 0 ? (
                <div className="p-12 text-center text-arena-textMuted text-xs">
                  No allied commanders registered. Transmit a friend request to expand your squad!
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.address}
                    className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-arena-violet to-arena-cyan flex items-center justify-center font-bold text-white uppercase">
                        {f.username ? f.username.slice(0, 2) : f.address.slice(2, 4)}
                      </div>
                      <div>
                        <div className="font-bold text-white">{f.username || 'Commander'}</div>
                        <div className="font-mono text-[10px] text-arena-textMuted">
                          {f.address.slice(0, 8)}...{f.address.slice(-6)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemoveFriend(f.address)}
                        className="p-1.5 rounded text-arena-textMuted hover:text-arena-red transition-colors"
                        title="Remove Ally"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Col: Send Request Form */}
        <div>
          <Card className="p-5 border-arena-border space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-arena-cyan" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Transmit Friend Request
              </h3>
            </div>
            <p className="text-xs text-arena-textSub leading-relaxed">
              Dispatch an alliance invite to an Ethereum address to link squad rosters and receive
              skirmish invitations.
            </p>

            <form onSubmit={handleSendRequest} className="space-y-3 pt-2">
              <input
                type="text"
                placeholder="0x... ETHEREUM ADDRESS"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                className="w-full bg-arena-bg border border-arena-border rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-arena-textMuted focus:outline-none focus:ring-1 focus:ring-arena-cyan"
              />
              <Button
                variant="cyan"
                size="md"
                type="submit"
                disabled={!isAuthenticated || !targetAddress.trim()}
                className="w-full"
              >
                Send Request
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

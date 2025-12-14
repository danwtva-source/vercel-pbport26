import React, { useState, useEffect } from 'react';
import { Round, Area, AREAS } from '../types';
import { api } from '../services/firebase';
import { Card, Button, Input, Modal, Badge } from '../components/UI';

/**
 * Modal form for creating or editing a funding round. Uses minimal fields: name,
 * start date, end date, and booleans controlling stage visibility. A list of areas
 * can be selected. On save, the supplied onSave callback is invoked with the
 * complete Round object.
 */
const RoundForm: React.FC<{ round?: Round; onSave: (r: Round) => void; onClose: () => void; }>
  = ({ round, onSave, onClose }) => {
    const isEdit = !!round;
    const [name, setName] = useState(round?.name || '');
    const [year, setYear] = useState(round?.year || new Date().getFullYear());
    const [status, setStatus] = useState<'planning' | 'open' | 'scoring' | 'voting' | 'closed'>(round?.status || 'planning');
    const [startDate, setStartDate] = useState(round?.startDate || '');
    const [endDate, setEndDate] = useState(round?.endDate || '');
    const [areas, setAreas] = useState<Area[]>(round?.areas || []);
    const [stage1Open, setStage1Open] = useState(round?.stage1Open ?? true);
    const [stage2Open, setStage2Open] = useState(round?.stage2Open ?? false);
    const [scoringOpen, setScoringOpen] = useState(round?.scoringOpen ?? false);

    const toggleArea = (a: Area) => {
        setAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const id = round?.id || `round_${Date.now()}`;
        const r: Round = {
            id,
            name: name.trim() || 'Untitled Round',
            year,
            status,
            startDate,
            endDate,
            areas,
            stage1Open,
            stage2Open,
            scoringOpen,
            createdAt: round?.createdAt || Date.now(),
            // Only include optional fields if they exist (avoid undefined values in Firestore)
            ...(round?.scoringCriteria && { scoringCriteria: round.scoringCriteria }),
            ...(round?.scoringThreshold !== undefined && { scoringThreshold: round.scoringThreshold }),
        };
        onSave(r);
    };
    return (
        <Modal isOpen={true} onClose={onClose} title={isEdit ? 'Edit Round' : 'New Round'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Round Name" value={name} onChange={e => setName(e.target.value)} required />
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} required />
                    <div>
                        <label className="block font-bold mb-2 text-sm">Status</label>
                        <select className="w-full p-3 border rounded-xl" value={status} onChange={e => setStatus(e.target.value as any)} required>
                            <option value="planning">Planning</option>
                            <option value="open">Open</option>
                            <option value="scoring">Scoring</option>
                            <option value="voting">Voting</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                    <Input label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                </div>
                <div>
                    <label className="block font-bold mb-2">Applicable Areas</label>
                    <div className="grid md:grid-cols-2 gap-2">
                        {AREAS.map(a => (
                            <label key={a} className="flex items-center gap-2 cursor-pointer p-2 border rounded-md hover:bg-gray-50">
                                <input type="checkbox" checked={areas.includes(a)} onChange={() => toggleArea(a)} className="accent-brand-purple" />
                                <span>{a}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={stage1Open} onChange={() => setStage1Open(!stage1Open)} className="accent-brand-purple" /><span>Stage 1 Open</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={stage2Open} onChange={() => setStage2Open(!stage2Open)} className="accent-brand-purple" /><span>Stage 2 Open</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={scoringOpen} onChange={() => setScoringOpen(!scoringOpen)} className="accent-brand-purple" /><span>Scoring Open</span></label>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save</Button>
                </div>
            </form>
        </Modal>
    );
};

/**
 * Administrative component for managing rounds. Provides a list of existing rounds and
 * allows admins to create, edit and delete rounds. Currently does not handle scoring
 * criteria configuration; that can be added in a future enhancement.
 */
export const AdminRounds: React.FC = () => {
    const [rounds, setRounds] = useState<Round[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRound, setEditingRound] = useState<Round | undefined>(undefined);

    const load = () => {
        api.getRounds().then(setRounds);
    };
    useEffect(() => { load(); }, []);

    const handleSave = async (r: Round) => {
        try {
            console.log("Saving round:", r);
            if (editingRound) {
                await api.updateRound(r.id, r);
                console.log("Round updated successfully");
            } else {
                await api.createRound(r);
                console.log("Round created successfully");
            }
            setIsModalOpen(false);
            setEditingRound(undefined);
            load();
        } catch (error) {
            console.error("Error saving round:", error);
            alert(`Failed to save round: ${(error as Error).message}`);
        }
    };
    const handleDelete = async (r: Round) => {
        if (confirm('Delete this round?')) {
            await api.deleteRound(r.id);
            load();
        }
    };
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl">Rounds</h3>
                <Button size="sm" onClick={() => { setEditingRound(undefined); setIsModalOpen(true); }}>+ New Round</Button>
            </div>
            {rounds.length === 0 ? <p className="text-gray-500">No rounds defined yet.</p> : (
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b"><th className="p-3">Name</th><th className="p-3">Dates</th><th className="p-3">Areas</th><th className="p-3">Lifecycle</th><th className="p-3">Actions</th></tr>
                    </thead>
                    <tbody>
                        {rounds.map(r => (
                            <tr key={r.id} className="border-b">
                                <td className="p-3 font-bold">{r.name}</td>
                                <td className="p-3 text-sm">{r.startDate} → {r.endDate}</td>
                                <td className="p-3 text-sm">
                                    {r.areas.length > 0 ? r.areas.map(a => <Badge key={a}>{a}</Badge>) : <Badge>All Areas</Badge>}
                                </td>
                                <td className="p-3 text-sm flex gap-1 flex-wrap">
                                    <Badge className={r.stage1Open ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}>Stage 1 {r.stage1Open ? 'Open' : 'Closed'}</Badge>
                                    <Badge className={r.stage2Open ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}>Stage 2 {r.stage2Open ? 'Open' : 'Closed'}</Badge>
                                    <Badge className={r.scoringOpen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}>Scoring {r.scoringOpen ? 'Open' : 'Closed'}</Badge>
                                </td>
                                <td className="p-3">
                                    <button onClick={() => { setEditingRound(r); setIsModalOpen(true); }} className="text-blue-600 mr-2">Edit</button>
                                    <button onClick={() => handleDelete(r)} className="text-red-600">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {isModalOpen && <RoundForm round={editingRound} onSave={handleSave} onClose={() => { setIsModalOpen(false); setEditingRound(undefined); }} />}
        </Card>
    );
};

export default AdminRounds;
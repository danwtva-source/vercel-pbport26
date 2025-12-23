import React, { useEffect, useState } from 'react';
import { Round, Area } from '../types';
import { api } from '../services/firebase';
import { Button, Modal, Input, Badge } from '../components/UI';

const RoundFormModal: React.FC<{ round?: Round; onSave: (r: Round) => void; onClose: () => void; isOpen: boolean; }> 
  = ({ round, onSave, onClose, isOpen }) => {
    if (!isOpen) return null;
    const isEdit = !!round;
    const [name, setName] = useState(round?.name || '');
    const [year, setYear] = useState(round?.year || new Date().getFullYear());
    const [status, setStatus] = useState<'planning' | 'open' | 'scoring' | 'voting' | 'closed'>(round?.status || 'planning');
    const [startDate, setStartDate] = useState(round?.startDate || '');
    const [endDate, setEndDate] = useState(round?.endDate || '');
    const [areas, setAreas] = useState<Area[]>(round?.areas || []);
    const [stage1Open, setStage1Open] = useState(round?.stage1Open || false);
    const [stage2Open, setStage2Open] = useState(round?.stage2Open || false);
    const [scoringOpen, setScoringOpen] = useState(round?.scoringOpen || false);

    const toggleArea = (area: Area) => {
        setAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const id = round?.id || 'round_' + Date.now();
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
            scoringCriteria: round?.scoringCriteria,
            scoringThreshold: round?.scoringThreshold,
        };
        onSave(r);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Round' : 'Create Round'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Round Name" value={name} onChange={e => setName(e.target.value)} required />
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} required />
                    <div>
                        <label className="block font-bold mb-2 text-sm">Status</label>
                        <select className="w-full p-3 border rounded-xl" value={status} onChange={e => setStatus(e.target.value as typeof status)} required>
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
                    <label className="block font-bold mb-2 text-sm">Areas</label>
                    <div className="flex flex-wrap gap-2">
                        {(['Blaenavon','Thornhill & Upper Cwmbran','Trevethin–Penygarn–St Cadoc’s'] as Area[]).map(a => (
                            <button type="button" key={a} onClick={() => toggleArea(a)} className={`px-3 py-1 rounded-full text-xs font-bold border ${areas.includes(a) ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>
                                {a}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={stage1Open} onChange={e => setStage1Open(e.target.checked)} /> Stage 1 Open</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={stage2Open} onChange={e => setStage2Open(e.target.checked)} /> Stage 2 Open</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={scoringOpen} onChange={e => setScoringOpen(e.target.checked)} /> Scoring Open</label>
                </div>
                <Button type="submit" className="w-full">Save Round</Button>
            </form>
        </Modal>
    );
};

export const AdminRounds: React.FC = () => {
    const [rounds, setRounds] = useState<Round[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRound, setEditingRound] = useState<Round | undefined>(undefined);

    const load = async () => setRounds(await api.getRounds());
    useEffect(() => { load(); }, []);

    const handleSave = async (r: Round) => {
        if (editingRound) {
            await api.updateRound(r.id, r);
        } else {
            await api.createRound(r);
        }
        setModalOpen(false);
        setEditingRound(undefined);
        load();
    };
    const handleDelete = async (r: Round) => {
        if (confirm('Delete this round?')) {
            await api.deleteRound(r.id);
            load();
        }
    };

    return (
        <div className="space-y-4">
            <Button onClick={() => { setEditingRound(undefined); setModalOpen(true); }}>New Round</Button>
            <div className="grid gap-4">
                {rounds.map(r => (
                    <div key={r.id} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">{r.name} ({r.year})</h3>
                            <div className="text-xs text-gray-500">{r.startDate} – {r.endDate}</div>
                            <div className="flex gap-2 mt-2">
                                <Badge>{r.status}</Badge>
                                {r.stage1Open && <Badge>Stage 1 Open</Badge>}
                                {r.stage2Open && <Badge>Stage 2 Open</Badge>}
                                {r.scoringOpen && <Badge>Scoring Open</Badge>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setEditingRound(r); setModalOpen(true); }}>Edit</Button>
                            <Button variant="outline" onClick={() => handleDelete(r)}>Delete</Button>
                        </div>
                    </div>
                ))}
            </div>
            <RoundFormModal round={editingRound} onSave={handleSave} onClose={() => setModalOpen(false)} isOpen={modalOpen} />
        </div>
    );
};

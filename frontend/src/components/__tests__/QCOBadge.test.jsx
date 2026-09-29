import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import QCOBadge from '../QCOBadge';

describe('QCOBadge Component', () => {
    it('renders nothing when no alerts and no qco', () => {
        const { container } = render(<QCOBadge alerts={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders mandatory badge when alert contains MANDATORY_COMPLIANCE', () => {
        render(<QCOBadge alerts={["MANDATORY_COMPLIANCE"]} />);
        expect(screen.getByText(/QCO gazette mandatory/i)).toBeInTheDocument();
    });

    it('renders mandatory badge when qco has evidence cited and is_mandatory', () => {
        const qco = { evidence_level: 'cited', is_mandatory: true };
        render(<QCOBadge qco={qco} />);
        expect(screen.getByText(/QCO gazette mandatory/i)).toBeInTheDocument();
    });

    it('renders unverified badge when alert contains UNVERIFIED_QCO', () => {
        render(<QCOBadge alerts={["UNVERIFIED_QCO"]} />);
        expect(screen.getByText(/Unverified — confirm the gazette/i)).toBeInTheDocument();
    });

    it('renders unverified badge when qco evidence_level is unverified', () => {
        const qco = { evidence_level: 'unverified' };
        render(<QCOBadge qco={qco} />);
        expect(screen.getByText(/Unverified — confirm the gazette/i)).toBeInTheDocument();
    });
});

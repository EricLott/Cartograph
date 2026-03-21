import React from 'react';
import { VscAzure, VscServer, VscCircuitBoard, VscHubot } from "react-icons/vsc";
import { SiGooglecloud, SiDocker, SiKubernetes, SiPulumi, SiPodman, SiTerraform } from "react-icons/si";
import { TbFileLambda } from "react-icons/tb";
import { FaAws, FaRegHandPointer } from "react-icons/fa";
import { GiWeightLiftingUp } from "react-icons/gi";

export const STANDARD_DECISIONS = {
    'infra_hosting': {
        options: [
            { id: 'azure', label: 'Azure', icon: <VscAzure /> },
            { id: 'aws', label: 'AWS', icon: <FaAws /> },
            { id: 'gcp', label: 'GCP', icon: <SiGooglecloud /> },
            { id: 'hybrid', label: 'Hybrid', icon: <VscHubot /> },
            { id: 'onprem', label: 'On-Premise', icon: <VscServer /> }
        ]
    },
    'infra_containerization': {
        options: [
            { id: 'docker', label: 'Docker', icon: <SiDocker /> },
            { id: 'k8s', label: 'Kubernetes', icon: <SiKubernetes /> },
            { id: 'podman', label: 'Podman', icon: <SiPodman /> },
            { id: 'none', label: 'None (Bare Metal/VM)', icon: <VscCircuitBoard /> }
        ]
    },
    'infra_iac': {
        options: [
            { id: 'terraform', label: 'Terraform', icon: <SiTerraform /> },
            { id: 'bicep', label: 'Bicep/ARM', icon: <GiWeightLiftingUp /> },
            { id: 'pulumi', label: 'Pulumi', icon: <SiPulumi /> },
            { id: 'cdk', label: 'AWS CDK', icon: <TbFileLambda /> },
            { id: 'manual', label: 'Manual/ClickOps', icon: <FaRegHandPointer /> }
        ]
    }
};

export const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

export const PendingIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
);

export const ConfigOption = ({ option, onClick }) => (
    <button className="config-option-btn glass-panel" onClick={() => onClick(option.label)}>
        <span className="config-option-icon">{option.icon}</span>
        <span className="config-option-label">{option.label}</span>
    </button>
);

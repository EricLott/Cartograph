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

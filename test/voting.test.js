// expectRevert : permet de tester que certaines fonctions échouent comme prévu (ex. si un non-votant essaie d'ajouter une proposition).
// expectEvent : permet de vérifier qu’un événement spécifique a été émis par le contrat après une action.
const { BN, expectRevert, expectEvent } = require("@openzeppelin/test-helpers");
const { expect } = require("chai"); // expect : permet d’écrire des assertions plus lisibles avec Chai (ex. expect(val).to.be.equal(...))


const Voting = artifacts.require("Voting");

contract("Voting", (accounts) => {
  const owner = accounts[0];      // compte qui déploie le contrat (le propriétaire)
  const voter1 = accounts[1];     // compte utilisé comme votant
  const voter2 = accounts[2];     // second votant
  const outsider = accounts[3];   // compte non inscrit en tant que votant

  let instance; // on déclare une variable instance qui contiendra le contrat Voting déployé.

  // avant chaque test, on déploie une nouvelle instance du contrat propre
  beforeEach(async () => {
    instance = await Voting.new({ from: owner });
  });

  //  TEST 1 : Ajout et récupération de votant
  it("devrait permettre au propriétaire d'ajouter un votant et de consulter", async () => {
    const tx = await instance.addVoter(voter1, { from: owner });

    // Vérifie que l’événement a été émis
    expectEvent(tx, "VoterRegistered", { voterAddress: voter1 });

    const voter = await instance.getVoter(voter1, { from: voter1 });
    expect(voter.isRegistered).to.be.true;
    expect(voter.hasVoted).to.be.false;
    expect(new BN(voter.votedProposalId)).to.be.bignumber.equal(new BN(0));
  });

  //  TEST 2 : Un non-votant ne peut pas accéder aux fonctions réservées
  it("devrait empêcher un non-votant de consulter une proposition", async () => {
    await expectRevert(
      instance.getOneProposal(0, { from: outsider }),
      "You're not a voter"
    );
  });

  //  TEST 3 : Phase d’enregistrement des propositions
  it("devrait permettre d'enregistrer une proposition et de la récupérer", async () => {
    await instance.addVoter(voter1, { from: owner });
    await instance.startProposalsRegistering({ from: owner });
    const tx = await instance.addProposal("Une idée brillante", { from: voter1 });

    expectEvent(tx, "ProposalRegistered", {
      proposalId: new BN(1)
    });

    const proposal = await instance.getOneProposal(1, { from: voter1 });
    expect(proposal.description).to.equal("Une idée brillante");
    expect(new BN(proposal.voteCount)).to.be.bignumber.equal(new BN(0));
  });

  //  TEST 4 : Refuser les propositions vides
  it("devrait rejeter une proposition avec une description vide", async () => {
    await instance.addVoter(voter1, { from: owner });
    await instance.startProposalsRegistering({ from: owner });

    await expectRevert(
      instance.addProposal("", { from: voter1 }),
      "Vous ne pouvez pas ne rien proposer"
    );
  });

  //  TEST 5 : Vote d’un votant
  it("devrait permettre à un votant de voter pour une proposition", async () => {
    await instance.addVoter(voter1, { from: owner });
    await instance.startProposalsRegistering({ from: owner });
    await instance.addProposal("Proposition A", { from: voter1 });
    await instance.endProposalsRegistering({ from: owner });
    await instance.startVotingSession({ from: owner });

    const voteTx = await instance.setVote(1, { from: voter1 });
    expectEvent(voteTx, "Voted", {
      voter: voter1,
      proposalId: new BN(1)
    });

    const voter = await instance.getVoter(voter1, { from: voter1 });
    expect(voter.hasVoted).to.be.true;
    expect(new BN(voter.votedProposalId)).to.be.bignumber.equal(new BN(1));

    const proposal = await instance.getOneProposal(1, { from: voter1 });
    expect(new BN(proposal.voteCount)).to.be.bignumber.equal(new BN(1));
  });

  //  TEST 6 : Empêcher de voter deux fois
  it("devrait empêcher un votant de voter deux fois", async () => {
    await instance.addVoter(voter1, { from: owner });
    await instance.startProposalsRegistering({ from: owner });
    await instance.addProposal("Proposition A", { from: voter1 });
    await instance.endProposalsRegistering({ from: owner });
    await instance.startVotingSession({ from: owner });
    await instance.setVote(1, { from: voter1 });

    await expectRevert(
      instance.setVote(1, { from: voter1 }),
      "You have already voted"
    );
  });

  //  TEST 7 : Tallier les votes correctement
  it("devrait comptabiliser les votes et déterminer le gagnant", async () => {
    await instance.addVoter(voter1, { from: owner });
    await instance.addVoter(voter2, { from: owner });
    await instance.startProposalsRegistering({ from: owner });
    await instance.addProposal("Proposition Gagnante", { from: voter1 });
    await instance.addProposal("Perdante", { from: voter2 });
    await instance.endProposalsRegistering({ from: owner });
    await instance.startVotingSession({ from: owner });
    await instance.setVote(1, { from: voter1 });
    await instance.setVote(1, { from: voter2 });
    await instance.endVotingSession({ from: owner });

    const tx = await instance.tallyVotes({ from: owner });
    expectEvent(tx, "WorkflowStatusChange", {
      previousStatus: new BN(4),
      newStatus: new BN(5)
    });

    const winner = await instance.winningProposalID();
    expect(new BN(winner)).to.be.bignumber.equal(new BN(1));
  });

  //  TEST 8 : Ne pas pouvoir voter hors période
  it("devrait empêcher de voter en dehors de la phase de vote", async () => {
    await instance.addVoter(voter1, { from: owner });

    await expectRevert(
      instance.setVote(0, { from: voter1 }),
      "Voting session havent started yet"
    );
  });
});
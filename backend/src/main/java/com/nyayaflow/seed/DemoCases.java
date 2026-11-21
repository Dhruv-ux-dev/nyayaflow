package com.nyayaflow.seed;

import static com.nyayaflow.cases.CasePriority.HIGH;
import static com.nyayaflow.cases.CasePriority.NORMAL;
import static com.nyayaflow.cases.CasePriority.URGENT;
import static com.nyayaflow.cases.CaseStatus.AWAITING_DECISION;
import static com.nyayaflow.cases.CaseStatus.CLOSED;
import static com.nyayaflow.cases.CaseType.ARBITRATION;
import static com.nyayaflow.cases.CaseType.BAIL_APPLICATION;
import static com.nyayaflow.cases.CaseType.CIVIL_APPEAL;
import static com.nyayaflow.cases.CaseType.CIVIL_SUIT;
import static com.nyayaflow.cases.CaseType.COMMERCIAL_SUIT;
import static com.nyayaflow.cases.CaseType.CRIMINAL_APPEAL;
import static com.nyayaflow.cases.CaseType.CRIMINAL_CASE;
import static com.nyayaflow.cases.CaseType.FAMILY_MATTER;
import static com.nyayaflow.cases.CaseType.WRIT_PETITION;
import static com.nyayaflow.cases.PartySide.PETITIONER;
import static com.nyayaflow.cases.PartySide.RESPONDENT;
import static com.nyayaflow.cases.PartyType.GOVERNMENT;
import static com.nyayaflow.cases.PartyType.INDIVIDUAL;
import static com.nyayaflow.cases.PartyType.ORGANIZATION;
import static com.nyayaflow.document.DocumentType.AFFIDAVIT;
import static com.nyayaflow.document.DocumentType.APPLICATION;
import static com.nyayaflow.document.DocumentType.EVIDENCE;
import static com.nyayaflow.document.DocumentType.JUDGMENT;
import static com.nyayaflow.document.DocumentType.OTHER;
import static com.nyayaflow.document.DocumentType.PETITION;
import static com.nyayaflow.document.DocumentType.REPLY;
import static com.nyayaflow.hearing.HearingType.ARGUMENTS;
import static com.nyayaflow.hearing.HearingType.FINAL_ARGUMENTS;
import static com.nyayaflow.hearing.HearingType.FIRST_HEARING;
import static com.nyayaflow.hearing.HearingType.FRAMING_OF_ISSUES;
import static com.nyayaflow.hearing.HearingType.INTERIM_APPLICATION;
import static com.nyayaflow.hearing.HearingType.JUDGMENT_PRONOUNCEMENT;
import static com.nyayaflow.order.OrderType.DIRECTION;
import static com.nyayaflow.order.OrderType.FINAL_ORDER;
import static com.nyayaflow.order.OrderType.INTERIM_ORDER;

import java.util.List;

import com.nyayaflow.hearing.HearingType;
import com.nyayaflow.order.OrderType;

/** Fictional cases with believable histories. Names, parties and facts are invented. */
final class DemoCases {

    private DemoCases() {
    }

    static List<CaseScript> all() {
        return List.of(
                CaseScript.of(CIVIL_SUIT, "Sharma Builders Pvt. Ltd. v. Gupta Infra Projects LLP")
                        .about("Suit for recovery of ₹48,60,000 with interest for TMT steel and cement supplied to the "
                                + "Lakeview Residency project, against which payment was withheld.")
                        .priority(HIGH)
                        .filed(-240, "ICC", "Court Room 1", "neha")
                        .petitioner("Sharma Builders Pvt. Ltd.", ORGANIZATION, "Plot 14, Industrial Area Phase II, Indrapuri")
                        .respondent("Gupta Infra Projects LLP", ORGANIZATION, "3rd Floor, Meridian Tower, MG Road, Indrapuri")
                        .counsel("rohan", PETITIONER, true)
                        .counsel("kabir", RESPONDENT, true)
                        .document(-240, PETITION, "Plaint with annexures", "rohan",
                                "Plaint under Order VII CPC with statement of account and copies of invoices.")
                        .assign(-237, "raghavan", "neha")
                        .held(-200, "10:30", FIRST_HEARING, "Appearance of the defendant",
                                "Defendant appeared; written statement to be filed within 30 days.",
                                "Summons served. Counsel for the defendant appeared and sought time to file the written "
                                        + "statement. Thirty days granted as a last opportunity.")
                        .document(-172, REPLY, "Written statement of the defendant", "kabir",
                                "Denies liability and alleges that part of the steel supplied was below specification.")
                        .held(-150, "11:00", FRAMING_OF_ISSUES, "Framing of issues",
                                "Issues framed; plaintiff's evidence by affidavit within 45 days.",
                                "Pleadings complete. Issues framed: (1) whether the plaintiff proves supply of material "
                                        + "worth ₹61.2 lakh; (2) whether the material was defective; (3) relief.")
                        .document(-110, EVIDENCE, "Invoices and delivery challans", "rohan",
                                "Forty-two GST invoices with delivery challans signed by the defendant's site engineer.")
                        .adjourned(-90, "12:00", EVIDENCE_STAGE, "Plaintiff's evidence",
                                "Adjourned: PW-1 unwell, medical certificate filed.",
                                "PW-1 absent; medical certificate placed on record. Adjourned at the plaintiff's request "
                                        + "subject to costs of ₹2,000.")
                        .document(-62, AFFIDAVIT, "Evidence affidavit of PW-1 (Rajesh Sharma)", "rohan",
                                "Examination-in-chief of the plaintiff's director by way of affidavit.")
                        .held(-45, "10:30", EVIDENCE_STAGE, "Examination of PW-1",
                                "PW-1 examined in chief; cross-examination deferred.",
                                "PW-1 tendered affidavit Ex. PW1/A and exhibits PW1/1 to PW1/42. Cross-examination "
                                        + "deferred at the defendant's request.")
                        .deadline(-3, "Produce original ledger for inspection",
                                "Plaintiff to produce the original ledger for the supply period before the next date.",
                                HIGH, "rohan", false, "suresh")
                        .document(-1, APPLICATION, "Application for inspection of documents", "kabir",
                                "Application under Order XI Rule 15 CPC seeking inspection of the plaintiff's stock register.")
                        .listed(0, "11:00", EVIDENCE_STAGE, "Cross-examination of PW-1")
                        .deadline(5, "File list of defence witnesses",
                                "Defendant to file its list of witnesses under Order XVI CPC.", NORMAL, "kabir", false,
                                "suresh"),

                CaseScript.of(WRIT_PETITION,
                                "Indrapuri Residents' Welfare Association v. Municipal Corporation of Indrapuri")
                        .about("Writ petition challenging a demolition notice issued to 46 houses in Gandhi Colony "
                                + "without a hearing, although the colony was regularised in 2011.")
                        .priority(URGENT)
                        .filed(-120, "ICC", "Court Room 1", "neha")
                        .petitioner("Indrapuri Residents' Welfare Association", ORGANIZATION, "Gandhi Colony, Ward 12, Indrapuri")
                        .respondent("Municipal Corporation of Indrapuri", GOVERNMENT, "Nagar Nigam Bhawan, Indrapuri")
                        .respondent("Commissioner, Municipal Corporation of Indrapuri", GOVERNMENT, null)
                        .counsel("priya", PETITIONER, true)
                        .counsel("vikram", RESPONDENT, true)
                        .document(-120, PETITION, "Writ petition with annexures", "priya",
                                "Petition under Article 226 with the impugned notice and the 2011 regularisation order.")
                        .assign(-119, "raghavan", "neha")
                        .held(-117, "10:30", FIRST_HEARING, "Admission and interim relief",
                                "Notice issued; status quo on demolition ordered.",
                                "Notice issued, returnable in four weeks. Since 46 families would be rendered homeless, "
                                        + "the parties are directed to maintain status quo.")
                        .order(-117, INTERIM_ORDER, "Status quo on demolition",
                                "Issue notice to the respondents, returnable in four weeks. Till the next date of hearing, "
                                        + "the parties shall maintain status quo regarding the structures in Gandhi Colony "
                                        + "covered by the impugned notice. The respondents may file a counter affidavit.")
                        .document(-90, REPLY, "Counter affidavit of the Corporation", "vikram",
                                "Contends that the structures encroach upon a storm-water drainage channel.")
                        .document(-75, REPLY, "Rejoinder of the petitioner", "priya",
                                "Disputes the survey relied upon by the Corporation.")
                        .held(-70, "11:30", ARGUMENTS, "Arguments",
                                "Petitioner's arguments heard in part.",
                                "Counsel for the petitioner argued that the 2011 regularisation order was never withdrawn. "
                                        + "Part-heard.")
                        .document(-60, EVIDENCE, "Site inspection photographs", "priya",
                                "Photographs of Gandhi Colony and the drainage channel.")
                        .adjourned(-40, "12:00", ARGUMENTS, "Respondent's arguments",
                                "Adjourned at the request of the Corporation's counsel.",
                                "Counsel for the Corporation sought time to produce the survey map. Interim order to continue.")
                        .held(-12, "14:30", FINAL_ARGUMENTS, "Final arguments",
                                "Arguments concluded; judgment reserved.",
                                "Final arguments of both sides heard. Written submissions within one week. Judgment reserved.")
                        .status(-12, AWAITING_DECISION, "Arguments concluded; judgment reserved.", "raghavan")
                        .deadline(-5, "Written submissions (both sides)", "Short written submissions, at most 10 pages.",
                                HIGH, "priya", true, "raghavan")
                        .listed(6, "14:30", JUDGMENT_PRONOUNCEMENT, "Judgment reserved after final arguments"),

                CaseScript.of(BAIL_APPLICATION, "Ramesh Yadav v. State of Indrapuri")
                        .about("Regular bail application under Section 480 BNSS in an FIR registered at P.S. Kotwali under "
                                + "Sections 318 and 316 BNS. The applicant has been in custody since his arrest.")
                        .priority(URGENT)
                        .filed(-12, "ICC", "Court Room 2", "neha")
                        .petitioner("Ramesh Yadav", INDIVIDUAL, "H.No. 22, Shastri Nagar, Indrapuri")
                        .respondent("State of Indrapuri", GOVERNMENT, "Through the Public Prosecutor")
                        .counsel("sana", PETITIONER, true)
                        .counsel("devendra", RESPONDENT, true)
                        .document(-12, APPLICATION, "Bail application", "sana", "Application under Section 480 BNSS.")
                        .document(-12, EVIDENCE, "Copy of the FIR", "sana", "FIR registered at P.S. Kotwali.")
                        .assign(-11, "kulkarni", "neha")
                        .held(-6, "10:30", FIRST_HEARING, "Notice to the State",
                                "Notice accepted by the PP; case diary called for.",
                                "Learned PP accepts notice and seeks time for instructions. The investigating officer shall "
                                        + "produce the case diary and a status report on the next date.")
                        .document(-3, OTHER, "Medical certificate of the applicant", "sana",
                                "Certificate from the jail medical officer regarding the applicant's diabetes.")
                        .deadline(1, "Status report of the investigating officer",
                                "IO to file a status report through the Public Prosecutor.", URGENT, "devendra", false,
                                "kulkarni")
                        .listed(1, "10:30", ARGUMENTS, "Bail, with the status report of the investigating officer"),

                CaseScript.of(CRIMINAL_CASE, "State v. Mohit Verma & Anr.")
                        .about("Prosecution for cheating and criminal breach of trust (Sections 318 and 316 BNS) arising "
                                + "out of a chit-fund scheme that collected deposits from about 140 investors.")
                        .priority(HIGH)
                        .filed(-300, "ICC", "Court Room 2", "neha")
                        .petitioner("State of Indrapuri", GOVERNMENT, "Through P.S. Civil Lines")
                        .respondent("Mohit Verma", INDIVIDUAL, "Flat 7B, Silver Oak Apartments, Indrapuri")
                        .respondent("Rakesh Verma", INDIVIDUAL, "Flat 7B, Silver Oak Apartments, Indrapuri")
                        .counsel("devendra", PETITIONER, true)
                        .counsel("kabir", RESPONDENT, true)
                        .document(-300, PETITION, "Charge sheet", "neha",
                                "Final report under Section 193 BNSS with a list of 23 witnesses.")
                        .assign(-298, "kulkarni", "neha")
                        .held(-260, "11:00", FIRST_HEARING, "Supply of copies",
                                "Copies supplied to the accused; listed for arguments on charge.",
                                "Both accused present on bail. Copies of the charge sheet supplied.")
                        .held(-200, "11:30", FRAMING_OF_ISSUES, "Arguments on charge",
                                "Charges framed; accused pleaded not guilty.",
                                "Charges framed under Sections 318 and 316 read with Section 3(5) BNS. The accused pleaded "
                                        + "not guilty and claimed trial.")
                        .order(-200, INTERIM_ORDER, "Order on framing of charges",
                                "Having heard both sides and perused the record, a prima facie case is made out against both "
                                        + "accused. Charges are framed accordingly and read over to the accused, who plead "
                                        + "not guilty. Prosecution evidence to commence.")
                        .held(-130, "12:00", EVIDENCE_STAGE, "Prosecution evidence",
                                "PW-1 and PW-2 examined and cross-examined.",
                                "PW-1 (complainant investor) and PW-2 (bank manager) examined and cross-examined.")
                        .adjourned(-60, "12:00", EVIDENCE_STAGE, "Prosecution evidence",
                                "Adjourned: summons to PW-3 to PW-5 returned unserved.",
                                "Summons to PW-3 to PW-5 returned unserved. Fresh summons to issue through the SHO.")
                        .deadline(10, "Serve summons on PW-3 to PW-5",
                                "Ensure service through the SHO, P.S. Civil Lines.", HIGH, "suresh", false, "kulkarni")
                        .listed(-1, "12:00", EVIDENCE_STAGE, "Examination of PW-3 to PW-5"),

                CaseScript.of(FAMILY_MATTER, "Anjali Mehra v. Siddharth Mehra")
                        .about("Joint petition for divorce by mutual consent under Section 13B of the Hindu Marriage Act, "
                                + "1955. The parties have lived separately for over two years and settled all claims.")
                        .filed(-200, "ICC", "Court Room 3", "neha")
                        .petitioner("Anjali Mehra", INDIVIDUAL, "B-41, Sector 9, Indrapuri")
                        .respondent("Siddharth Mehra", INDIVIDUAL, "27, Lake Road, Shantipur")
                        .counsel("ananya", PETITIONER, true)
                        .counsel("priya", RESPONDENT, true)
                        .document(-200, PETITION, "Joint petition under Section 13B(1)", "ananya",
                                "First motion petition signed by both parties.")
                        .document(-200, AFFIDAVIT, "Affidavits of both parties", "ananya",
                                "Affidavits confirming separation and free consent.")
                        .assign(-198, "siddiqui", "neha")
                        .held(-190, "11:00", FIRST_HEARING, "First motion",
                                "Statements recorded; first motion allowed.",
                                "Both parties present and identified by counsel. Statements recorded. First motion allowed.")
                        .document(-185, OTHER, "Settlement agreement", "priya",
                                "Terms on permanent alimony and return of articles.")
                        .held(-14, "11:30", FINAL_ARGUMENTS, "Second motion",
                                "Second motion statements recorded; decree passed.",
                                "The parties reaffirmed their consent. No possibility of reconciliation. Settlement terms "
                                        + "placed on record.")
                        .order(-14, FINAL_ORDER, "Decree of divorce by mutual consent",
                                "The marriage between the parties is dissolved by a decree of divorce by mutual consent under "
                                        + "Section 13B of the Hindu Marriage Act, 1955. The settlement agreement placed on "
                                        + "record shall form part of the decree. Decree sheet be drawn up accordingly."),

                CaseScript.of(COMMERCIAL_SUIT, "Nexora Software Solutions v. Brightline Retail Pvt. Ltd.")
                        .about("Commercial suit for ₹1.2 crore in unpaid licence fees and damages for wrongful termination "
                                + "of a three-year retail analytics software agreement.")
                        .priority(HIGH)
                        .filed(-60, "ICC", "Court Room 1", "neha")
                        .petitioner("Nexora Software Solutions Pvt. Ltd.", ORGANIZATION, "Tower B, Cyber Park, Indrapuri")
                        .respondent("Brightline Retail Pvt. Ltd.", ORGANIZATION, "Brightline House, Station Road, Shantipur")
                        .counsel("rohan", PETITIONER, true)
                        .counsel("ananya", RESPONDENT, true)
                        .document(-60, PETITION, "Plaint under the Commercial Courts Act", "rohan",
                                "Plaint with statement of truth and list of documents.")
                        .document(-60, EVIDENCE, "Master Services Agreement", "rohan",
                                "Executed agreement with the termination clause relied upon.")
                        .assign(-57, "raghavan", "neha")
                        .deadline(-20, "Serve summons on the defendant",
                                "Summons with a copy of the plaint by registered post and email.", NORMAL, "neha", true,
                                "neha")
                        .document(-1, OTHER, "Vakalatnama and memo of appearance", "ananya",
                                "Appearance on behalf of the defendant.")
                        .listed(3, "10:30", FIRST_HEARING, "Case management under Order XV-A CPC"),

                CaseScript.of(CIVIL_APPEAL, "Lalit Prasad v. Kamla Devi")
                        .about("First appeal against a decree declaring the respondent owner of a 1,200 sq. ft. plot in "
                                + "Ram Nagar.")
                        .filed(-400, "ICC", "Court Room 2", "neha")
                        .petitioner("Lalit Prasad", INDIVIDUAL, "Ram Nagar, Indrapuri")
                        .respondent("Kamla Devi", INDIVIDUAL, "Ram Nagar, Indrapuri")
                        .counsel("vikram", PETITIONER, true)
                        .counsel("sana", RESPONDENT, true)
                        .document(-400, PETITION, "Memorandum of appeal", "vikram", "Grounds of appeal under Section 96 CPC.")
                        .document(-399, JUDGMENT, "Certified copy of the trial court judgment", "vikram",
                                "Judgment and decree under appeal.")
                        .assign(-396, "kulkarni", "neha")
                        .held(-360, "11:00", FIRST_HEARING, "Admission",
                                "Appeal admitted; trial court record summoned.", "Appeal admitted. Record summoned.")
                        .held(-200, "12:00", ARGUMENTS, "Arguments", "Appellant's arguments heard.",
                                "Arguments of the appellant heard on the validity of the 1998 sale deed.")
                        .held(-75, "12:30", FINAL_ARGUMENTS, "Final arguments",
                                "Arguments concluded; judgment reserved.", "Reply arguments heard. Judgment reserved.")
                        .status(-75, AWAITING_DECISION, "Judgment reserved.", "kulkarni")
                        .order(-60, JUDGMENT_ORDER, "Appeal dismissed",
                                "The trial court correctly appreciated the registered sale deed relied upon by the respondent "
                                        + "and the revenue record. No ground for interference is made out. The appeal is "
                                        + "dismissed with costs. Decree sheet be prepared.")
                        .status(-30, CLOSED, "Decree drawn up; record consigned to the record room.", "neha"),

                CaseScript.of(ARBITRATION, "Meridian Logistics Pvt. Ltd. v. Coastal Freight Carriers")
                        .about("Petition under Section 9 of the Arbitration and Conciliation Act, 1996 to restrain the "
                                + "invocation of a ₹75 lakh bank guarantee pending arbitration.")
                        .priority(HIGH)
                        .filed(-30, "ICC", "Court Room 3", "neha")
                        .petitioner("Meridian Logistics Pvt. Ltd.", ORGANIZATION, "Warehouse 6, Transport Nagar, Indrapuri")
                        .respondent("Coastal Freight Carriers", ORGANIZATION, "Port Road, Shantipur")
                        .counsel("kabir", PETITIONER, true)
                        .counsel("rohan", RESPONDENT, true)
                        .document(-30, PETITION, "Petition under Section 9", "kabir",
                                "Petition with the arbitration clause and the notice invoking arbitration.")
                        .document(-30, EVIDENCE, "Bank guarantee and transport contract", "kabir",
                                "Performance bank guarantee and the underlying contract.")
                        .assign(-29, "siddiqui", "neha")
                        .held(-25, "10:30", FIRST_HEARING, "Ad-interim relief",
                                "Ad-interim injunction granted; reply within two weeks.",
                                "Prima facie case made out. Respondent restrained from invoking the bank guarantee till "
                                        + "the next date.")
                        .order(-25, INTERIM_ORDER, "Ad-interim injunction on bank guarantee",
                                "Till the next date of hearing, the respondent shall not invoke the performance bank guarantee. "
                                        + "The petitioner shall keep the guarantee alive. Reply within two weeks.")
                        .deadline(1, "File reply to the Section 9 petition",
                                "Respondent's reply with documents; advance copy to the petitioner.", HIGH, "rohan", false,
                                "siddiqui")
                        .listed(2, "10:30", ARGUMENTS, "Interim relief pending arbitration"),

                CaseScript.of(CIVIL_SUIT, "Kavita Bansal v. Rajiv Bansal & Ors.")
                        .about("Suit for partition and separate possession of ancestral agricultural land (8.4 acres) and "
                                + "a house at Patel Nagar.")
                        .filed(-3, "ICC", null, "neha")
                        .petitioner("Kavita Bansal", INDIVIDUAL, "Patel Nagar, Indrapuri")
                        .respondent("Rajiv Bansal", INDIVIDUAL, "Patel Nagar, Indrapuri")
                        .respondent("Sunita Bansal", INDIVIDUAL, "Civil Lines, Shantipur")
                        .counsel("priya", PETITIONER, true)
                        .document(-3, PETITION, "Plaint for partition", "priya",
                                "Plaint with genealogy table and revenue records."),

                CaseScript.of(CRIMINAL_APPEAL, "Sunil Thakur v. State of Indrapuri")
                        .about("Appeal against conviction under Section 106(1) BNS (death by negligence) and a sentence of "
                                + "two years' imprisonment arising out of a road accident on the Ring Road.")
                        .filed(-180, "ICC", "Court Room 1", "neha")
                        .petitioner("Sunil Thakur", INDIVIDUAL, "Village Kheri, Indrapuri")
                        .respondent("State of Indrapuri", GOVERNMENT, "Through the Public Prosecutor")
                        .counsel("vikram", PETITIONER, true)
                        .counsel("devendra", RESPONDENT, true)
                        .document(-180, PETITION, "Memorandum of criminal appeal", "vikram", "Grounds of appeal.")
                        .document(-180, JUDGMENT, "Judgment of the trial court", "vikram", "Judgment of conviction and order on sentence.")
                        .document(-180, APPLICATION, "Application for suspension of sentence", "vikram",
                                "Application with the appellant's custody certificate.")
                        .assign(-179, "raghavan", "neha")
                        .held(-172, "11:00", FIRST_HEARING, "Admission and suspension of sentence",
                                "Appeal admitted; sentence suspended on bail bond of ₹50,000.",
                                "Appeal admitted. Considering the appellant's clean antecedents, sentence suspended.")
                        .order(-172, INTERIM_ORDER, "Suspension of sentence",
                                "The sentence awarded to the appellant is suspended during the pendency of the appeal, and he "
                                        + "is admitted to bail on furnishing a bond of ₹50,000 with one surety.")
                        .adjourned(-100, "12:30", ARGUMENTS, "Arguments", "Adjourned: trial court record awaited.",
                                "Trial court record not received. Reminder to issue.")
                        .held(-35, "12:00", ARGUMENTS, "Arguments", "Appellant's arguments heard; State to reply.",
                                "Arguments of the appellant concluded on the site plan and eyewitness account.")
                        .listed(9, "12:00", FINAL_ARGUMENTS, "Reply on behalf of the State"),

                CaseScript.of(WRIT_PETITION, "Green Earth Foundation v. State Pollution Control Board & Ors.")
                        .about("Public interest petition alleging discharge of untreated effluents by dyeing units into the "
                                + "Saraswati canal, which supplies drinking water to nine villages.")
                        .priority(URGENT)
                        .filed(-1, "ICC", null, "neha")
                        .petitioner("Green Earth Foundation", ORGANIZATION, "12, Gyan Marg, Indrapuri")
                        .respondent("State Pollution Control Board", GOVERNMENT, "Paryavaran Bhawan, Indrapuri")
                        .respondent("Indrapuri Dyers' Association", ORGANIZATION, "Industrial Estate, Indrapuri")
                        .counsel("ananya", PETITIONER, true)
                        .document(-1, PETITION, "Public interest writ petition", "ananya", "Petition under Article 226.")
                        .document(-1, EVIDENCE, "Water quality test reports", "ananya",
                                "Laboratory reports of samples drawn at four points along the canal."),

                CaseScript.of(CIVIL_SUIT, "Pooja Khanna v. Skyline Developers")
                        .about("Suit for refund of ₹32,00,000 paid towards a flat in Skyline Heights, possession of which "
                                + "was promised within 36 months but never delivered.")
                        .filed(-150, "SDC", "Court Hall A", "lakshmi")
                        .petitioner("Pooja Khanna", INDIVIDUAL, "C-12, Green Park, Shantipur")
                        .respondent("Skyline Developers", ORGANIZATION, "Skyline House, Collectorate Road, Shantipur")
                        .counsel("sana", PETITIONER, true)
                        .counsel("kabir", RESPONDENT, true)
                        .document(-150, PETITION, "Plaint for refund", "sana", "Plaint with payment schedule.")
                        .document(-150, EVIDENCE, "Builder-buyer agreement and payment receipts", "sana",
                                "Agreement and eleven payment receipts.")
                        .assign(-148, "gill", "lakshmi")
                        .held(-140, "11:00", FIRST_HEARING, "Appearance",
                                "Defendant appeared; written statement within 30 days.",
                                "Counsel for the defendant appeared and sought time to file the written statement.")
                        .document(-110, REPLY, "Written statement of the defendant", "kabir",
                                "Pleads force majeure due to delayed environmental clearance.")
                        .held(-70, "11:30", INTERIM_APPLICATION, "Application for deposit",
                                "Defendant directed to deposit ₹5,00,000.",
                                "Heard on the plaintiff's application for a direction to deposit part of the amount.")
                        .order(-70, DIRECTION, "Direction to deposit ₹5,00,000",
                                "The defendant shall deposit ₹5,00,000 with the Nazir of this Court within eight weeks, "
                                        + "without prejudice to its contentions.")
                        .deadline(-14, "Deposit ₹5,00,000 with the Nazir",
                                "Compliance with the direction on the deposit application.", HIGH, "kabir", false, "gill")
                        .listed(4, "11:00", EVIDENCE_STAGE, "Examination of the plaintiff"),

                CaseScript.of(FAMILY_MATTER, "Rekha Sharma v. Manoj Sharma")
                        .about("Application for maintenance under Section 144 BNSS by the wife on behalf of herself and "
                                + "two minor children.")
                        .filed(-90, "SDC", "Court Hall B", "lakshmi")
                        .petitioner("Rekha Sharma", INDIVIDUAL, "Ward 4, Shantipur")
                        .respondent("Manoj Sharma", INDIVIDUAL, "Railway Colony, Shantipur")
                        .counsel("priya", PETITIONER, true)
                        .counsel("vikram", RESPONDENT, true)
                        .document(-90, APPLICATION, "Maintenance application", "priya",
                                "Application with details of the respondent's employment.")
                        .assign(-88, "gill", "lakshmi")
                        .held(-60, "12:00", INTERIM_APPLICATION, "Interim maintenance",
                                "Interim maintenance of ₹12,000 per month granted.",
                                "Considering the respondent's salary slip, interim maintenance is fixed.")
                        .order(-60, INTERIM_ORDER, "Interim maintenance",
                                "The respondent shall pay interim maintenance of ₹12,000 per month to the applicant and the "
                                        + "two minor children from the date of the application, payable by the 10th of every month.")
                        .document(-30, AFFIDAVIT, "Affidavit of assets and liabilities (applicant)", "priya",
                                "Disclosure affidavit in the prescribed format.")
                        .deadline(8, "File affidavit of assets and liabilities (respondent)",
                                "Disclosure affidavit in the prescribed format.", NORMAL, "vikram", false, "gill")
                        .listed(0, "14:00", ARGUMENTS, "Main application for maintenance"),

                CaseScript.of(BAIL_APPLICATION, "Imran Sheikh v. State of Indrapuri")
                        .about("Application for anticipatory bail under Section 482 BNSS arising out of a dispute over a "
                                + "commercial shop lease.")
                        .priority(HIGH)
                        .filed(-20, "ICC", "Court Room 3", "neha")
                        .petitioner("Imran Sheikh", INDIVIDUAL, "Old City, Indrapuri")
                        .respondent("State of Indrapuri", GOVERNMENT, "Through the Public Prosecutor")
                        .counsel("sana", PETITIONER, true)
                        .counsel("devendra", RESPONDENT, true)
                        .document(-20, APPLICATION, "Anticipatory bail application", "sana", "Application under Section 482 BNSS.")
                        .assign(-19, "siddiqui", "neha")
                        .held(-15, "12:30", FIRST_HEARING, "Notice to the State",
                                "Interim protection granted till the next date.",
                                "Notice to the State. The dispute appears civil in nature; interim protection granted.")
                        .order(-15, INTERIM_ORDER, "Interim protection from arrest",
                                "No coercive steps shall be taken against the applicant till the next date, subject to his "
                                        + "joining the investigation as and when required.")
                        .held(-8, "11:00", ARGUMENTS, "Arguments", "Arguments heard; application allowed.",
                                "Status report perused. Applicant has joined investigation and cooperated.")
                        .order(-8, FINAL_ORDER, "Anticipatory bail granted",
                                "In the event of arrest, the applicant shall be released on bail on furnishing a personal "
                                        + "bond of ₹50,000 with one surety. He shall join the investigation as required and "
                                        + "shall not leave the country without the Court's permission."),

                CaseScript.of(COMMERCIAL_SUIT, "Vistara Agro Exports v. Bharat Cold Chain Ltd.")
                        .about("Claim of ₹86,40,000 for a consignment of export-grade grapes that spoiled because of a "
                                + "temperature failure in the defendant's cold storage.")
                        .filed(-75, "ICC", "Court Room 2", "neha")
                        .petitioner("Vistara Agro Exports", ORGANIZATION, "Mandi Road, Indrapuri")
                        .respondent("Bharat Cold Chain Ltd.", ORGANIZATION, "NH-48 Logistics Park, Indrapuri")
                        .counsel("rohan", PETITIONER, true)
                        .counsel("vikram", RESPONDENT, true)
                        .document(-75, PETITION, "Plaint", "rohan", "Plaint with statement of truth.")
                        .document(-75, EVIDENCE, "Temperature logs and surveyor's report", "rohan",
                                "Data-logger records and the independent surveyor's report.")
                        .assign(-73, "kulkarni", "neha")
                        .held(-68, "11:00", FIRST_HEARING, "Case management hearing",
                                "Timelines fixed under Order XV-A CPC.", "Case management schedule fixed.")
                        .document(-50, REPLY, "Written statement", "vikram",
                                "Alleges that the consignment was received already over-ripe.")
                        .held(-30, "12:00", FRAMING_OF_ISSUES, "Framing of issues",
                                "Issues framed; plaintiff's evidence by affidavit.", "Issues framed on liability and quantum.")
                        .listed(0, "12:00", EVIDENCE_STAGE, "Examination of the independent surveyor"),

                CaseScript.of(CIVIL_SUIT, "Harish Chandra Charitable Trust v. Vandana Kapoor")
                        .about("Suit for eviction of a tenant from a ground-floor shop on Mall Road and recovery of 18 "
                                + "months' arrears of rent.")
                        .filed(-260, "ICC", "Court Room 3", "neha")
                        .petitioner("Harish Chandra Charitable Trust", ORGANIZATION, "Mall Road, Indrapuri")
                        .respondent("Vandana Kapoor", INDIVIDUAL, "Shop No. 3, Mall Road, Indrapuri")
                        .counsel("ananya", PETITIONER, true)
                        .counsel("rohan", RESPONDENT, true)
                        .document(-260, PETITION, "Plaint for eviction and arrears", "ananya", "Plaint with the lease deed.")
                        .assign(-258, "siddiqui", "neha")
                        .held(-220, "10:30", FIRST_HEARING, "Appearance", "Defendant appeared; written statement ordered.",
                                "Defendant appeared in person with counsel.")
                        .document(-190, REPLY, "Written statement of the tenant", "rohan",
                                "Claims the rent was tendered and refused.")
                        .held(-120, "11:00", INTERIM_APPLICATION, "Application under Order XV Rule 5 CPC",
                                "Tenant directed to deposit admitted arrears.", "Heard on the landlord's application.")
                        .order(-120, DIRECTION, "Deposit of admitted arrears of rent",
                                "The defendant shall deposit the admitted arrears of rent and continue to deposit the "
                                        + "monthly rent by the 10th of each month, failing which her defence is liable to be struck off.")
                        .held(-40, "11:30", EVIDENCE_STAGE, "Plaintiff's evidence", "Plaintiff's evidence closed.",
                                "Trust's secretary examined as PW-1. Plaintiff's evidence closed.")
                        .deadline(-10, "Deposit admitted arrears of rent",
                                "Deposit of ₹3,60,000 and monthly rent thereafter.", HIGH, "rohan", false, "siddiqui")
                        .document(-2, APPLICATION, "Application to strike off the defence", "ananya",
                                "Application under Order XV Rule 5 CPC for non-deposit of admitted rent.")
                        .listed(0, "10:30", ARGUMENTS, "Including the plea to strike off the defence for non-deposit"),

                CaseScript.of(CRIMINAL_CASE, "Deepak Traders v. Karan Arora")
                        .about("Complaint under Section 138 of the Negotiable Instruments Act, 1881 for dishonour of a "
                                + "cheque of ₹7,50,000 issued towards the price of goods sold.")
                        .filed(-330, "SDC", "Court Hall A", "lakshmi")
                        .petitioner("Deepak Traders", ORGANIZATION, "Main Bazaar, Shantipur")
                        .respondent("Karan Arora", INDIVIDUAL, "Model Town, Shantipur")
                        .counsel("kabir", PETITIONER, true)
                        .counsel("sana", RESPONDENT, true)
                        .document(-330, PETITION, "Complaint with cheque, return memo and legal notice", "kabir",
                                "Complaint with the dishonoured cheque and postal receipts.")
                        .assign(-328, "gill", "lakshmi")
                        .held(-300, "10:30", FIRST_HEARING, "Pre-summoning evidence", "Accused summoned.",
                                "Pre-summoning evidence considered. Accused summoned.")
                        .held(-210, "11:00", EVIDENCE_STAGE, "Complainant's evidence", "CW-1 examined and cross-examined.",
                                "CW-1 (proprietor) examined and cross-examined.")
                        .held(-120, "11:30", EVIDENCE_STAGE, "Statement of the accused",
                                "Statement of the accused recorded.", "Statement under Section 351 BNSS recorded.")
                        .held(-20, "12:00", FINAL_ARGUMENTS, "Final arguments", "Arguments concluded; judgment reserved.",
                                "Final arguments heard. Judgment reserved.")
                        .status(-20, AWAITING_DECISION, "Final arguments concluded; judgment reserved.", "gill")
                        .listed(11, "15:00", JUDGMENT_PRONOUNCEMENT, "Judgment reserved after final arguments"),

                CaseScript.of(WRIT_PETITION, "Prakash Rao v. State of Indrapuri & Ors.")
                        .about("Petition by a retired school headmaster seeking release of withheld pension and gratuity "
                                + "with interest.")
                        .filed(-500, "ICC", "Court Room 1", "neha")
                        .petitioner("Prakash Rao", INDIVIDUAL, "Teachers' Colony, Indrapuri")
                        .respondent("State of Indrapuri", GOVERNMENT, "Through the Secretary, School Education")
                        .respondent("District Education Officer, Indrapuri", GOVERNMENT, null)
                        .counsel("rohan", PETITIONER, true)
                        .counsel("vikram", RESPONDENT, true)
                        .document(-500, PETITION, "Writ petition", "rohan", "Petition with the retirement order.")
                        .assign(-498, "raghavan", "neha")
                        .held(-470, "11:00", FIRST_HEARING, "Admission", "Notice issued.", "Notice issued to the respondents.")
                        .document(-430, REPLY, "Counter affidavit of the State", "vikram",
                                "Cites a pending audit objection.")
                        .held(-150, "12:00", FINAL_ARGUMENTS, "Final hearing", "Arguments concluded; judgment reserved.",
                                "Both sides heard. Judgment reserved.")
                        .status(-150, AWAITING_DECISION, "Judgment reserved.", "raghavan")
                        .order(-120, JUDGMENT_ORDER, "Petition allowed",
                                "An audit objection cannot justify withholding pension indefinitely. The respondents shall "
                                        + "release the pension and gratuity within eight weeks with interest at 7% per annum.")
                        .status(-90, CLOSED, "Compliance reported by the State; file consigned to records.", "neha"),

                CaseScript.of(CIVIL_APPEAL, "Shree Ganesh Textiles v. Pragati Co-operative Bank Ltd.")
                        .about("Appeal against a money decree of ₹22,40,000 passed in favour of the bank on a cash-credit "
                                + "facility.")
                        .filed(-45, "ICC", "Court Room 2", "neha")
                        .petitioner("Shree Ganesh Textiles", ORGANIZATION, "Cloth Market, Indrapuri")
                        .respondent("Pragati Co-operative Bank Ltd.", ORGANIZATION, "Head Office, Indrapuri")
                        .counsel("priya", PETITIONER, true)
                        .counsel("kabir", RESPONDENT, true)
                        .document(-45, PETITION, "Memorandum of appeal", "priya", "Grounds of appeal with the decree.")
                        .assign(-40, "kulkarni", "neha")
                        .listed(5, "11:30", FIRST_HEARING, "Admission of the appeal"),

                CaseScript.of(ARBITRATION, "Orion Power Systems v. Sunrise Solar Parks Ltd.")
                        .about("Petition under Section 34 of the Arbitration and Conciliation Act, 1996 to set aside an "
                                + "award of ₹3.4 crore relating to delayed commissioning of a 20 MW solar plant.")
                        .priority(HIGH)
                        .filed(-95, "ICC", "Court Room 1", "neha")
                        .petitioner("Orion Power Systems", ORGANIZATION, "Electronic City, Indrapuri")
                        .respondent("Sunrise Solar Parks Ltd.", ORGANIZATION, "Solar Park Road, Shantipur")
                        .counsel("kabir", PETITIONER, true)
                        .counsel("ananya", RESPONDENT, true)
                        .document(-95, PETITION, "Petition under Section 34", "kabir", "Grounds to set aside the award.")
                        .document(-95, EVIDENCE, "Arbitral award and tribunal record", "kabir", "Award and proceedings record.")
                        .assign(-93, "raghavan", "neha")
                        .held(-85, "12:00", FIRST_HEARING, "Admission", "Notice issued; award not stayed.",
                                "Notice issued. No stay of the award at this stage.")
                        .document(-55, REPLY, "Reply of the award holder", "ananya", "Supports the award.")
                        .adjourned(-20, "12:30", ARGUMENTS, "Arguments", "Adjourned: counsel for the petitioner unwell.",
                                "Adjourned on the petitioner's request.")
                        .listed(14, "11:30", ARGUMENTS, "Grounds of challenge to the award"),

                CaseScript.of(CIVIL_SUIT, "Neelam Joshi v. Amit Saxena")
                        .about("Suit for damages of ₹15,00,000 and a permanent injunction against defamatory posts on "
                                + "social media.")
                        .filed(-8, "SDC", "Court Hall C", "lakshmi")
                        .petitioner("Neelam Joshi", INDIVIDUAL, "Civil Lines, Shantipur")
                        .respondent("Amit Saxena", INDIVIDUAL, "Sadar Bazaar, Shantipur")
                        .counsel("sana", PETITIONER, true)
                        .document(-8, PETITION, "Plaint with screenshots of the posts", "sana",
                                "Plaint, screenshots and certificate under Section 63 BSA.")
                        .assign(-6, "gill", "lakshmi"),

                CaseScript.of(WRIT_PETITION, "Mahesh Kumar v. Indrapuri Development Authority")
                        .about("Challenge to the cancellation of a plot allotted under the economically weaker section scheme.")
                        .filed(-330, "ICC", "Court Room 1", "neha")
                        .petitioner("Mahesh Kumar", INDIVIDUAL, "Sector 21, Indrapuri")
                        .respondent("Indrapuri Development Authority", GOVERNMENT, "Vikas Bhawan, Indrapuri")
                        .counsel("vikram", PETITIONER, true)
                        .counsel("priya", RESPONDENT, true)
                        .document(-330, PETITION, "Writ petition", "vikram", "Petition with the cancellation order.")
                        .assign(-328, "raghavan", "neha")
                        .held(-300, "10:30", FIRST_HEARING, "Admission", "Notice issued.", "Notice issued.")
                        .held(-210, "11:00", FINAL_ARGUMENTS, "Final hearing", "Arguments concluded; judgment reserved.",
                                "Heard. Judgment reserved.")
                        .status(-210, AWAITING_DECISION, "Judgment reserved.", "raghavan")
                        .order(-200, JUDGMENT_ORDER, "Cancellation quashed",
                                "The cancellation was made without notice to the allottee. It is quashed. The Authority may "
                                        + "proceed afresh after giving the petitioner a hearing.")
                        .status(-180, CLOSED, "Disposed; record consigned.", "neha"),

                CaseScript.of(CRIMINAL_CASE, "State v. Rajat Malhotra")
                        .about("Prosecution for criminal intimidation and voluntarily causing hurt in a neighbourhood dispute.")
                        .filed(-280, "ICC", "Court Room 2", "neha")
                        .petitioner("State of Indrapuri", GOVERNMENT, "Through P.S. Model Town")
                        .respondent("Rajat Malhotra", INDIVIDUAL, "Model Town, Indrapuri")
                        .counsel("devendra", PETITIONER, true)
                        .counsel("sana", RESPONDENT, true)
                        .document(-280, PETITION, "Charge sheet", "neha", "Final report with five witnesses.")
                        .assign(-278, "kulkarni", "neha")
                        .held(-250, "11:00", EVIDENCE_STAGE, "Prosecution evidence", "Prosecution evidence recorded.",
                                "PW-1 to PW-3 examined.")
                        .held(-170, "12:00", FINAL_ARGUMENTS, "Final arguments", "Judgment reserved.", "Arguments heard.")
                        .status(-170, AWAITING_DECISION, "Judgment reserved.", "kulkarni")
                        .order(-150, JUDGMENT_ORDER, "Accused acquitted",
                                "The prosecution witnesses are inconsistent on the genesis of the incident and the injury is "
                                        + "not corroborated by medical evidence. The accused is acquitted.")
                        .status(-140, CLOSED, "Record consigned after the appeal period.", "neha"),

                CaseScript.of(FAMILY_MATTER, "Sunita Devi v. Ramlal")
                        .about("Maintenance application by an elderly mother against her son.")
                        .filed(-210, "ICC", "Court Room 3", "neha")
                        .petitioner("Sunita Devi", INDIVIDUAL, "Village Pipli, Indrapuri")
                        .respondent("Ramlal", INDIVIDUAL, "Village Pipli, Indrapuri")
                        .counsel("ananya", PETITIONER, true)
                        .counsel("vikram", RESPONDENT, true)
                        .document(-210, APPLICATION, "Maintenance application", "ananya", "Application with medical records.")
                        .assign(-208, "siddiqui", "neha")
                        .held(-180, "11:30", FIRST_HEARING, "Appearance", "Respondent appeared.", "Respondent appeared.")
                        .held(-110, "12:00", FINAL_ARGUMENTS, "Final arguments", "Arguments concluded.", "Arguments heard.")
                        .order(-100, FINAL_ORDER, "Maintenance of ₹8,000 per month granted",
                                "The respondent shall pay ₹8,000 per month to the applicant from the date of the application."),

                CaseScript.of(COMMERCIAL_SUIT, "Apex Steel Fabricators v. Konark Engineering Works")
                        .about("Recovery of the price of fabricated structural steel supplied for a warehouse.")
                        .filed(-250, "SDC", "Court Hall A", "lakshmi")
                        .petitioner("Apex Steel Fabricators", ORGANIZATION, "Industrial Area, Shantipur")
                        .respondent("Konark Engineering Works", ORGANIZATION, "Ring Road, Shantipur")
                        .counsel("kabir", PETITIONER, true)
                        .counsel("ananya", RESPONDENT, true)
                        .document(-250, PETITION, "Plaint", "kabir", "Plaint with invoices.")
                        .assign(-248, "gill", "lakshmi")
                        .held(-220, "11:00", FIRST_HEARING, "Case management hearing", "Timelines fixed.", "Schedule fixed.")
                        .held(-120, "11:30", FRAMING_OF_ISSUES, "Framing of issues", "Issues framed.", "Issues framed.")
                        .held(-60, "12:00", FINAL_ARGUMENTS, "Final arguments", "Judgment reserved.", "Arguments heard.")
                        .status(-60, AWAITING_DECISION, "Judgment reserved.", "gill")
                        .order(-45, JUDGMENT_ORDER, "Suit decreed",
                                "The plaintiff has proved delivery and acceptance of the material. The suit is decreed for "
                                        + "₹18,75,000 with interest at 9% per annum and costs."));
    }

    /** Hearing-type and order-type aliases for names that clash with document types. */
    private static final HearingType EVIDENCE_STAGE = HearingType.EVIDENCE;
    private static final OrderType JUDGMENT_ORDER = OrderType.JUDGMENT;
}

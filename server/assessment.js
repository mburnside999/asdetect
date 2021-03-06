var db = require('./pghelper'),
 config = require('./config'),
 missingAssessmentInformation='One or more mandatory fields on Assessment is missing.',
 winston = require('winston');


//helper function for input validation
function isEmpty(val){
    winston.info('assessment.isEmpty()');
    return (val === undefined || val == null || val == "") ? true : false;
}


function findById(externalUserId,id) {
    // Retrieve offer either by Salesforce id or Postgress id
    return db.query('select c.id,c.sfid,c.name,m.childs_initials__c,m.child_s_first_name__c,m.child_s_last_name__c,m.childs_nickname__c,c.consultation_date__c,c.record_type__c ,c.mch_child_asdetect__r__externalchildid__c as externalchildid, c.mch_child_asdetect__c,c.at_risk__c,c.age_at_time_of_assessment_years_months__c,c._hc_lastop,c._hc_err from asdetect.consultation_asdetect__c c,asdetect.mch_child_asdetect__c m where c.mch_child_asdetect__r__externalchildid__c=m.externalchildid__c and m.asdetect_contact__r__loyaltyid__c=$1 and ' + (isNaN(id) ? 'c.sfId' : 'c.id') + '=$2', [externalUserId,id], true);
};

function getAll(req, res, next) { 
    winston.info('assessment.getAll()');
    var externalUserId = req.externalUserId;
    db.query("select c.id,c.sfid,c.name, m.childs_initials__c,m.child_s_first_name__c,m.child_s_last_name__c,m.childs_nickname__c,c.consultation_date__c,c.record_type__c,c.mch_child_asdetect__r__externalchildid__c as externalchildid, c.mch_child_asdetect__c,c.at_risk__c,c.age_at_time_of_assessment_years_months__c,c._hc_lastop,c._hc_err from asdetect.consultation_asdetect__c c,asdetect.mch_child_asdetect__c m where c.mch_child_asdetect__r__externalchildid__c=m.externalchildid__c and m.asdetect_contact__r__loyaltyid__c=$1",[externalUserId]) 
        .then(function (assessment) {
            winston.info(JSON.stringify(assessment));
            return res.send(JSON.stringify(assessment));
        })
        .catch(next);
};


function getById(req, res, next) {
    var id = req.params.id;
    var externalUserId = req.externalUserId;
    findById(externalUserId,id)
        .then(function (assessment) {
            console.log(JSON.stringify(assessment));
            return res.send(JSON.stringify(assessment));
        })
        .catch(next);
};


// add 12 month assessment
function create12mAssessment(req, res, next) {
    winston.info('create12mAssessment');
    var externalUserId = req.externalUserId,
    externalchildid__c=req.body.externalchildid__c,
    consultation_date__c = req.body.consultation_date__c,
    pointing__c=req.body.pointing__c,
    does_child_make_eye_contact_with_you__c=req.body.does_child_make_eye_contact_with_you__c,
    waves_bye_bye__c=req.body.waves_bye_bye__c,
    imitation__c=req.body.imitation__c, 
    responds_to_name__c=req.body.responds_to_name__c,
    social_smile__c=req.body.social_smile__c, 
    conversational_babble__c=req.body.conversational_babble__c,
    says_1_3_clear_words__c=req.body.says_1_3_clear_words__c, 
    understands_obeys_simple_instructions__c=req.body.understands_obeys_simple_instructions__c, 
    attending_to_sounds__c=req.body.attending_to_sounds__c;
    

//basic error checking

if (isEmpty(consultation_date__c) || 
    isEmpty(pointing__c)|| 
    isEmpty(does_child_make_eye_contact_with_you__c)|| 
    isEmpty(waves_bye_bye__c) || 
    isEmpty(imitation__c)||
    isEmpty(responds_to_name__c)||
    isEmpty(social_smile__c) ||
    isEmpty(conversational_babble__c)||
    isEmpty(says_1_3_clear_words__c)||
    isEmpty(understands_obeys_simple_instructions__c)||
    isEmpty(attending_to_sounds__c) ) 
{
    return res.send(400, missingAssessmentInformation);
}


    //var recordtypeid='012j0000000mFHuAAM'; -- moved to config
    var recordtypeid=config.asdetect.recordType12M;

    //calculate at risk - TODO make this more robust
    winston.info('calculating external risk');
    var externalatrisk__c='No';
    var no_of_atypical_key_items=( (pointing__c=='Atypical'? 1:0) + (does_child_make_eye_contact_with_you__c=='Atypical'? 1: 0) +  (waves_bye_bye__c=='Atypical'? 1:0)  + (imitation__c=='Atypical'? 1:0)   + (responds_to_name__c=='Atypical'? 1:0)   );
    
    // at risk means 3 or more key items
    if (no_of_atypical_key_items>=3) {
        externalatrisk__c='Yes';
    } 
    else {
        externalatrisk__c='No';
    }
    console.log('Calculated external at risk:' + externalatrisk__c + ':count is '+ no_of_atypical_key_items);
    console.log(JSON.stringify(req.body));

    // insert into Postgres
    db.query('insert into asdetect.consultation_asdetect__c (recordtypeid,consultation_date__c,mch_child_asdetect__r__externalchildid__c ,pointing__c, does_child_make_eye_contact_with_you__c, waves_bye_bye__c, imitation__c, responds_to_name__c, social_smile__c, conversational_babble__c,says_1_3_clear_words__c, understands_obeys_simple_instructions__c, attending_to_sounds__c,externalatrisk__c) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)', [recordtypeid,consultation_date__c,externalchildid__c,pointing__c, does_child_make_eye_contact_with_you__c, waves_bye_bye__c, imitation__c, responds_to_name__c, social_smile__c, conversational_babble__c,says_1_3_clear_words__c, understands_obeys_simple_instructions__c, attending_to_sounds__c,externalatrisk__c], true)
    .then(function () {                    
        //return the calculated at risk
        return res.send({'externalatrisk__c':externalatrisk__c});
    })

    .fail(function(err) {
        return next(err);
    })

    .catch(next);

};

// add 18 month assessment
function create18mAssessment(req, res, next) {
    winston.info('create18mAssessment');
    var externalUserId = req.externalUserId,
    externalchildid__c=req.body.externalchildid__c,
    consultation_date__c = req.body.consultation_date__c,
    pointing__c=req.body.pointing__c,
    does_child_make_eye_contact_with_you__c=req.body.does_child_make_eye_contact_with_you__c,
    waves_bye_bye__c=req.body.waves_bye_bye__c,
    imitation__c=req.body.imitation__c, 
    responds_to_name__c=req.body.responds_to_name__c,
    social_smile__c=req.body.social_smile__c, 
    understands_obeys_simple_instructions__c=req.body.understands_obeys_simple_instructions__c, 
    showing__c=req.body.showing__c,
    pretend_play__c=req.body.pretend_play__c,
    follows_point__c=req.body.follows_point__c,
    uses_5_10_words__c=req.body.uses_5_10_words__c,
    understands_words__c=req.body.understands_words__c,
    points_to_facial_features__c=req.body.points_to_facial_features__c,
    loss_of_skills__c=req.body.loss_of_skills__c;

    

//basic error checking

if (isEmpty(consultation_date__c) || 
    isEmpty(pointing__c)||
    isEmpty(does_child_make_eye_contact_with_you__c)  || 
    isEmpty(waves_bye_bye__c) || 
    isEmpty(imitation__c)||
    isEmpty(responds_to_name__c)||
    isEmpty(social_smile__c) ||  
    isEmpty(understands_obeys_simple_instructions__c)||
    isEmpty(showing__c)||
    isEmpty(pretend_play__c)||
    isEmpty(follows_point__c)||
    isEmpty(uses_5_10_words__c)||
    isEmpty(understands_words__c)||
    isEmpty(points_to_facial_features__c)||
    isEmpty(loss_of_skills__c)

    ) {
    return res.send(400, missingAssessmentInformation);
}


    //var recordtypeid='012j0000000mFHuAAM'; -- moved to config
    var recordtypeid=config.asdetect.recordType18M;

    //calculate at risk - TODO make this more robust
    winston.info('calculating external risk');
    var externalatrisk__c='No';
    var no_of_atypical_key_items=( (pointing__c=='Atypical'? 1:0) + (does_child_make_eye_contact_with_you__c=='Atypical'? 1: 0) +  (waves_bye_bye__c=='Atypical'? 1:0)  + (showing__c=='Atypical'? 1:0)   + (pretend_play__c=='Atypical'? 1:0)   );
    
    if (no_of_atypical_key_items>=3) {
        externalatrisk__c='Yes';
    } 
    else {
        externalatrisk__c='No';
    }
    console.log('Calculated external at risk:' + externalatrisk__c + ':count is '+ no_of_atypical_key_items);
    console.log(JSON.stringify(req.body));

//insert into Postgres
    db.query('insert into asdetect.consultation_asdetect__c (recordtypeid,consultation_date__c,mch_child_asdetect__r__externalchildid__c ,pointing__c, does_child_make_eye_contact_with_you__c, waves_bye_bye__c, imitation__c, responds_to_name__c, social_smile__c, understands_obeys_simple_instructions__c,showing__c,pretend_play__c,follows_point__c,uses_5_10_words__c,understands_words__c,points_to_facial_features__c,loss_of_skills__c,externalatrisk__c) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)', [recordtypeid,consultation_date__c,externalchildid__c,pointing__c, does_child_make_eye_contact_with_you__c, waves_bye_bye__c, imitation__c, responds_to_name__c, social_smile__c, understands_obeys_simple_instructions__c,showing__c,pretend_play__c,follows_point__c,uses_5_10_words__c,understands_words__c,points_to_facial_features__c,loss_of_skills__c,externalatrisk__c], true)
    .then(function () {                   
        //return the calculated at risk
        return res.send({'externalatrisk__c':externalatrisk__c});
    })
    .fail(function(err) {
        return next(err);
    })
    .catch(next);

};


function create24mAssessment(req, res, next) {
    winston.info('create24mAssessment');
    var externalUserId = req.externalUserId,
    externalchildid__c=req.body.externalchildid__c,
    consultation_date__c = req.body.consultation_date__c,
    pointing__c=req.body.pointing__c,
    does_child_make_eye_contact_with_you__c=req.body.does_child_make_eye_contact_with_you__c,
    waves_bye_bye__c=req.body.waves_bye_bye__c,
    imitation__c=req.body.imitation__c, 
    responds_to_name__c=req.body.responds_to_name__c,
    social_smile__c=req.body.social_smile__c, 
    understands_obeys_simple_instructions__c=req.body.understands_obeys_simple_instructions__c, 
    showing__c=req.body.showing__c,
    pretend_play__c=req.body.pretend_play__c,
    follows_point__c=req.body.follows_point__c,
    loss_of_skills__c=req.body.loss_of_skills__c,
    uses_20_50_words__c=req.body.uses_20_50_words__c,
    two_word_utterances__c=req.body.two_word_utterances__c,
    parallel_play__c=req.body.parallel_play__c,
    interest_in_other_children__c=req.body.interest_in_other_children__c;


//basic error checking

if (isEmpty(consultation_date__c) || 
    isEmpty(pointing__c)||
    isEmpty(does_child_make_eye_contact_with_you__c)  || 
    isEmpty(waves_bye_bye__c) || 
    isEmpty(imitation__c)||
    isEmpty(responds_to_name__c)||
    isEmpty(social_smile__c) ||  
    isEmpty(understands_obeys_simple_instructions__c)||
    isEmpty(showing__c)||
    isEmpty(pretend_play__c)||
    isEmpty(follows_point__c)||
    isEmpty(loss_of_skills__c)||
    isEmpty(uses_20_50_words__c)||
    isEmpty(two_word_utterances__c)||
    isEmpty(parallel_play__c)||
    isEmpty(interest_in_other_children__c)

    ) {
    return res.send(400, missingAssessmentInformation);
}


    //var recordtypeid='012j0000000mFHuAAM'; -- moved to config
    var recordtypeid=config.asdetect.recordType24M;

    //calculate the at risk - TODO make this more robust
    winston.info('calculating external risk');
    var externalatrisk__c='No';
    var no_of_atypical_key_items=( (pointing__c=='Atypical'? 1:0) + (does_child_make_eye_contact_with_you__c=='Atypical'? 1: 0) +  (waves_bye_bye__c=='Atypical'? 1:0)  + (showing__c=='Atypical'? 1:0)   + (pretend_play__c=='Atypical'? 1:0)   );
    
    if (no_of_atypical_key_items>=3) {
        externalatrisk__c='Yes';
    } 
    else {
        externalatrisk__c='No';
    }
    
    console.log('Calculated external at risk:' + externalatrisk__c + ':count is '+ no_of_atypical_key_items);
    console.log(JSON.stringify(req.body));

    db.query('insert into asdetect.consultation_asdetect__c (recordtypeid,consultation_date__c,mch_child_asdetect__r__externalchildid__c ,pointing__c, does_child_make_eye_contact_with_you__c, waves_bye_bye__c, imitation__c, responds_to_name__c, social_smile__c, understands_obeys_simple_instructions__c,showing__c,pretend_play__c,follows_point__c,loss_of_skills__c,uses_20_50_words__c,two_word_utterances__c,parallel_play__c,interest_in_other_children__c,externalatrisk__c) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)', [recordtypeid,consultation_date__c,externalchildid__c,pointing__c, does_child_make_eye_contact_with_you__c, waves_bye_bye__c, imitation__c, responds_to_name__c, social_smile__c, understands_obeys_simple_instructions__c,showing__c,pretend_play__c,follows_point__c,loss_of_skills__c,uses_20_50_words__c,two_word_utterances__c,parallel_play__c,interest_in_other_children__c,externalatrisk__c], true)
    .then(function () {                   
        //return the calculated at risk
        return res.send({'externalatrisk__c':externalatrisk__c});
    })
    .fail(function(err) {
        return next(err);
    })
    .catch(next);

};



function create35yAssessment(req, res, next) {
    winston.info('create35yAssessment');
    var externalUserId = req.externalUserId,
    externalchildid__c=req.body.externalchildid__c,
    consultation_date__c = req.body.consultation_date__c,   
    pointing__c=req.body.pointing__c,
    does_child_make_eye_contact_with_you__c=req.body.does_child_make_eye_contact_with_you__c, 
    responds_to_name__c=req.body.responds_to_name__c,
    social_smile__c=req.body.social_smile__c,    
    showing__c=req.body.showing__c,
    pretend_play__c=req.body.pretend_play__c,
    follows_point__c=req.body.follows_point__c,
    loss_of_skills__c=req.body.loss_of_skills__c,
    follows_two_unrelated_commands__c=req.body.follows_two_unrelated_commands__c,
    odd_or_unusual_speech__c=req.body.odd_or_unusual_speech__c,
    sensory_behaviours_and_interests__c=req.body.sensory_behaviours_and_interests__c,
    reciprocal_social_interaction__c=req.body.reciprocal_social_interaction__c,
    gestures__c=req.body.gestures__c,
    sharing_interest__c=req.body.sharing_interest__c,
    uses_5_6_word_sentences__c=req.body.uses_5_6_word_sentences__c,
    conversation__c=req.body.conversation__c,
    hand_as_a_tool__c=req.body.hand_as_a_tool__c,
    immediate_echolalia__c=req.body.immediate_echolalia__c,
    pronoun_reversals__c=req.body.pronoun_reversals__c,
    repetitive_speech__c=req.body.repetitive_speech__c,
    motor_stereotypes__c =req.body.motor_stereotypes__c,
    rep_rest_behaviours_and_interests__c=req.body.rep_rest_behaviours_and_interests__c;



//basic error checking

if (isEmpty(consultation_date__c) || 
    isEmpty(pointing__c)||
    isEmpty(does_child_make_eye_contact_with_you__c)  || 
    isEmpty(responds_to_name__c)||
    isEmpty(social_smile__c) ||  
    isEmpty(showing__c)||
    isEmpty(pretend_play__c)||
    isEmpty(follows_point__c)||
    isEmpty(loss_of_skills__c)||
    isEmpty(follows_two_unrelated_commands__c)||
    isEmpty(odd_or_unusual_speech__c)||
    isEmpty(sensory_behaviours_and_interests__c)||
    isEmpty(reciprocal_social_interaction__c)||
    isEmpty(gestures__c)||
    isEmpty(sharing_interest__c)||
    isEmpty(uses_5_6_word_sentences__c)||
    isEmpty(conversation__c)||
    isEmpty(hand_as_a_tool__c)||
    isEmpty(immediate_echolalia__c)||
    isEmpty(pronoun_reversals__c)||
    isEmpty(repetitive_speech__c)||
    isEmpty(motor_stereotypes__c)||
    isEmpty(rep_rest_behaviours_and_interests__c)

    ) {
    return res.send(400, missingAssessmentInformation);
}


    //var recordtypeid='012j0000000mFHuAAM'; -- moved to config
    var recordtypeid=config.asdetect.recordType35Y;

    //calculate at risk - TODO make this more robust
    winston.info('calculating external risk');
    var externalatrisk__c='No';
    var no_of_atypical_key_items=( (pointing__c=='Atypical'? 1:0) + (does_child_make_eye_contact_with_you__c=='Atypical'? 1: 0) +  (showing__c=='Atypical'? 1:0)  + (pretend_play__c=='Atypical'? 1:0)   + (follows_two_unrelated_commands__c=='Atypical'? 1:0) + (odd_or_unusual_speech__c=='Atypical'? 1:0) + (sensory_behaviours_and_interests__c=='Atypical'? 1:0) +(reciprocal_social_interaction__c=='Atypical'? 1:0)  );
    
    if ((no_of_atypical_key_items>=3) ||(does_child_make_eye_contact_with_you__c=='Atypical')) {
        externalatrisk__c='Yes';
    } 
    else {
        externalatrisk__c='No';
    }
    
    console.log('Calculated external at risk (dont forget! for 35Y eyecontact is an override:' + externalatrisk__c + ':count is '+ no_of_atypical_key_items);
    console.log(JSON.stringify(req.body));
        
        db.query('insert into asdetect.consultation_asdetect__c (recordtypeid,consultation_date__c,mch_child_asdetect__r__externalchildid__c ,pointing__c, does_child_make_eye_contact_with_you__c, responds_to_name__c, social_smile__c,showing__c,pretend_play__c,follows_point__c,loss_of_skills__c,follows_two_unrelated_commands__c,odd_or_unusual_speech__c,sensory_behaviours_and_interests__c,reciprocal_social_interaction__c,gestures__c,sharing_interest__c,uses_5_6_word_sentences__c,conversation__c,hand_as_a_tool__c,immediate_echolalia__c,pronoun_reversals__c,repetitive_speech__c,motor_stereotypes__c,rep_rest_behaviours_and_interests__c,externalatrisk__c) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)', [recordtypeid,consultation_date__c,externalchildid__c,pointing__c, does_child_make_eye_contact_with_you__c, responds_to_name__c, social_smile__c,showing__c,pretend_play__c,follows_point__c,loss_of_skills__c,follows_two_unrelated_commands__c,odd_or_unusual_speech__c,sensory_behaviours_and_interests__c,reciprocal_social_interaction__c,gestures__c,sharing_interest__c,uses_5_6_word_sentences__c,conversation__c,hand_as_a_tool__c,immediate_echolalia__c,pronoun_reversals__c,repetitive_speech__c,motor_stereotypes__c,rep_rest_behaviours_and_interests__c,externalatrisk__c], true)
        .then(function () {                   
            //return the calculated at risk
        return res.send({'externalatrisk__c':externalatrisk__c});
        })
        .fail(function(err) {
            return next(err);
        })
        .catch(next);

    };

exports.findById = findById;
exports.getAll = getAll;
exports.getById = getById;
exports.create12mAssessment=create12mAssessment;
exports.create18mAssessment=create18mAssessment;
exports.create24mAssessment=create24mAssessment;
exports.create35yAssessment=create35yAssessment;

import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators, FormBuilder, FormArray } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, startWith, map } from 'rxjs/operators';

import {
  NoctuaFormConfigService,
  NoctuaAnnotonFormService,
  AnnotonError,
  noctuaFormConfig,
  Article,
  NoctuaLookupService
} from 'noctua-form-base';

import { withDropdownData } from './with-dropdown.tokens';
import { WithDropdownOverlayRef } from './with-dropdown-ref';
import { NoctuaFormDialogService } from 'app/main/apps/noctua-form';
import { SparqlService } from '@noctua.sparql/services/sparql/sparql.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'noc-with-dropdown',
  templateUrl: './with-dropdown.component.html',
  styleUrls: ['./with-dropdown.component.scss']
})

export class NoctuaWithDropdownComponent implements OnInit, OnDestroy {
  evidenceDBForm: FormGroup;
  formControl: FormControl;
  article: Article;

  weeks = [];
  connectedTo = [];

  myForm: FormGroup;

  private _unsubscribeAll: Subject<any>;

  indata = {
    companies: [
      {
        company: "example comany",
        projects: [
          {
            projectName: "example project",
          }
        ]
      }
    ]
  }


  options: string[] = ['One', 'Two', 'Three'];
  filteredOptions: Observable<string[]>;



  constructor(private fb: FormBuilder, public dialogRef: WithDropdownOverlayRef,
    @Inject(withDropdownData) public data: any,
    private noctuaLookupService: NoctuaLookupService,
    private noctuaFormDialogService: NoctuaFormDialogService,
    public noctuaFormConfigService: NoctuaFormConfigService,
    public noctuaAnnotonFormService: NoctuaAnnotonFormService,
  ) {
    this._unsubscribeAll = new Subject();
    this.formControl = data.formControl;

    this.myForm = this.fb.group({
      companies: this.fb.array([])
    })

    this.setCompanies();



    this.weeks = [
      {
        id: 'week-1',
        weeklist: [
          "item 1",
          "item 2",
          "item 3",
          "item 4",
          "item 5"
        ]
      }, {
        id: 'week-2',
        weeklist: [
          "item 1",
          "item 2",
          "item 3",
          "item 4",
          "item 5"
        ]
      }
    ];
    for (let week of this.weeks) {
      this.connectedTo.push(week.id);
    };
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.options.filter(option => option.toLowerCase().includes(filterValue));
  }


  addNewCompany() {
    let control = <FormArray>this.myForm.controls.companies;
    control.push(
      this.fb.group({
        company: [''],
        projects: this.fb.array([])
      })
    )
  }

  deleteCompany(index) {
    let control = <FormArray>this.myForm.controls.companies;
    control.removeAt(index)
  }

  addNewProject(control) {
    const projectName = new FormControl()
    control.push(this.fb.group({ projectName: projectName }));

    this._onValueChange(projectName)
  }

  deleteProject(control, index) {
    control.removeAt(index)
  }

  setCompanies() {
    let control = <FormArray>this.myForm.controls.companies;
    this.indata.companies.forEach(x => {
      control.push(this.fb.group({
        company: x.company,
        projects: this.setProjects(x)
      }))
    })
  }

  setProjects(x) {
    let arr = new FormArray([])
    x.projects.forEach(y => {
      arr.push(this.fb.group({
        projectName: y.projectName
      }))
    })
    return arr;
  }












  ngOnInit(): void {
    this.evidenceDBForm = this._createEvidenceDBForm();
  }

  clearValues() {

  }

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex);
    }
  }

  save2() {
    console.log(this.weeks);
  }

  save() {
    const self = this;
    const db = this.evidenceDBForm.value.db;
    const accession = this.evidenceDBForm.value.accession;
    const errors = [];
    let canSave = true;

    if (accession.trim() === '') {
      const error = new AnnotonError('error', 1, `${db.name} accession is required`);
      errors.push(error);
      self.noctuaFormDialogService.openAnnotonErrorsDialog(errors);
      canSave = false;
    }

    if (canSave) {
      this.formControl.setValue(db.name + ':' + accession.trim());
      this.close();
    }
  }

  cancelEvidenceDb() {
    this.evidenceDBForm.controls['accession'].setValue('');
  }

  private _createEvidenceDBForm() {
    return new FormGroup({
      db: new FormControl(this.noctuaFormConfigService.evidenceDBs.selected),
      accession: new FormControl('',
        [
          Validators.required,
        ])
    });
  }

  private _onValueChange(formControl: FormControl) {
    const self = this;


    this.filteredOptions = formControl.valueChanges
      .pipe(
        takeUntil(this._unsubscribeAll),
        distinctUntilChanged(),
        debounceTime(400),
        startWith(''),
        map(value => this._filter(value))
      );
  }

  close() {
    this.dialogRef.close();
  }

  private _updateArticle(value) {
    const self = this;

    if (value.db.name === noctuaFormConfig.evidenceDB.options.pmid.name && value.accession) {
      const pmid = value.accession.trim();

      if (pmid === '') {
        return;
      }
      this.noctuaLookupService.getPubmedInfo(pmid).pipe(
        takeUntil(this._unsubscribeAll))
        .subscribe((article: Article) => {
          self.article = article;
        });
    }
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
